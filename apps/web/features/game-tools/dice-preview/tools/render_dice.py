#!/usr/bin/env python3
"""Deterministic CPU ray tracing for Friemi dice sprite atlases.
The renderer intersects a rounded cube minus 21 spherical pip cavities.
Requires Python 3, numpy, scipy and Pillow. --runtime-only copies the six
validated atlases into the shipped preview runtime.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import json
import hashlib
import math
import shutil
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent
SIZE = 160
SAMPLES = 2
FRAMES = 32
FPS = 24
RADIUS = .40
PIP_RADIUS = .186
PIP_OFFSET = 1.095
EXTENT = 1.85
CAMERA = np.array([5.6, 7.2, 6.8], dtype=np.float64)
CAMERA /= np.linalg.norm(CAMERA)
LIGHT = np.array([-3.8, 7.8, 5.2], dtype=np.float64)
LIGHT /= np.linalg.norm(LIGHT)
RIGHT = np.cross(np.array([0., 1., 0.]), CAMERA); RIGHT /= np.linalg.norm(RIGHT)
UP = np.cross(CAMERA, RIGHT)
# Face vectors are permanent in MODEL space, opposites sum to seven.
FACES = {
    1: (np.array([0.,1.,0.]), np.array([1.,0.,0.]), np.array([0.,0.,1.])),
    6: (np.array([0.,-1.,0.]), np.array([1.,0.,0.]), np.array([0.,0.,-1.])),
    2: (np.array([0.,0.,1.]), np.array([1.,0.,0.]), np.array([0.,1.,0.])),
    5: (np.array([0.,0.,-1.]), np.array([-1.,0.,0.]), np.array([0.,1.,0.])),
    3: (np.array([1.,0.,0.]), np.array([0.,0.,-1.]), np.array([0.,1.,0.])),
    4: (np.array([-1.,0.,0.]), np.array([0.,0.,1.]), np.array([0.,1.,0.])),
}
PIP_LAYOUTS = {
    1: [(0,0)],
    2: [(-1,1),(1,-1)],
    3: [(-1,1),(0,0),(1,-1)],
    4: [(-1,-1),(-1,1),(1,-1),(1,1)],
    5: [(-1,-1),(-1,1),(0,0),(1,-1),(1,1)],
    6: [(-1,-1),(-1,0),(-1,1),(1,-1),(1,0),(1,1)],
}
CENTERS=[]; PIP_FACE=[]
for face, (normal,u,v) in FACES.items():
    for x,y in PIP_LAYOUTS[face]:
        CENTERS.append(normal*PIP_OFFSET + u*x*.43 + v*y*.43)
        PIP_FACE.append(face)
CENTERS=np.array(CENTERS)
PIP_FACE=np.array(PIP_FACE)
TREE=cKDTree(CENTERS)

# A fixed studio environment shared by all frames. Reflecting these rectangular
# softboxes in the surface normal creates real moving strip highlights.
SOFTBOXES = [
    {'direction':[-3.8,7.8,5.2], 'width':.48, 'height':1.28, 'strength':1.10, 'color':[1.,1.,1.]},
    {'direction':[7.,3.4,-3.8], 'width':.30, 'height':1.16, 'strength':.82, 'color':[.89,.94,1.]},
    {'direction':[-3.,8.,-5.5], 'width':.70, 'height':.48, 'strength':.28, 'color':[1.,1.,1.]},
]
FILL_LIGHT=np.array([6.,3.,7.],dtype=float)
FILL_LIGHT/=np.linalg.norm(FILL_LIGHT)


def smoothstep(edge0,edge1,x):
    t=np.clip((x-edge0)/(edge1-edge0),0,1)
    return t*t*(3-2*t)


def reflected_softboxes(normal,view,r):
    ndv=np.maximum(normal@view,0)
    reflected=(2*ndv[:,None]*normal-view) @ r.T
    radiance=np.zeros_like(normal)
    for box in SOFTBOXES:
        axis=np.array(box['direction'],dtype=float); axis/=np.linalg.norm(axis)
        horizontal=np.cross(axis,np.array([0.,1.,0.])); horizontal/=np.linalg.norm(horizontal)
        vertical=np.cross(horizontal,axis)
        facing=reflected@axis
        x=np.abs(reflected@horizontal)/np.maximum(facing,.001)
        y=np.abs(reflected@vertical)/np.maximum(facing,.001)
        # Soft edges approximate a slightly rough clear coat reflecting a softbox.
        mask=(1-smoothstep(box['width']*.55,box['width']*1.32,x))*(1-smoothstep(box['height']*.65,box['height']*1.25,y))*(facing>0)
        radiance+=mask[:,None]*box['strength']*np.array(box['color'])
    fresnel=.055+.945*(1-ndv)**5
    return radiance*(.19+.60*fresnel)[:,None]


def rotation(axis, angle):
    a=np.asarray(axis,dtype=float); a/=np.linalg.norm(a)
    x,y,z=a; c=math.cos(angle); s=math.sin(angle); t=1-c
    return np.array([[t*x*x+c,t*x*y-s*z,t*x*z+s*y],
                     [t*x*y+s*z,t*y*y+c,t*y*z-s*x],
                     [t*x*z-s*y,t*y*z+s*x,t*z*z+c]])


def target_rotation(face):
    n=FACES[face][0]; up=np.array([0.,1.,0.]); dot=float(n@up)
    if dot>0.999: align=np.eye(3)
    elif dot<-.999: align=rotation([1,0,0],math.pi)
    else: align=rotation(np.cross(n,up),math.acos(dot))
    return rotation([0,1,0],math.radians(-7)) @ align


def pose(face, frame):
    # Spin slows continuously to zero. The last six frames contain one small
    # damped rigid-body wobble and then exactly flat, identical end poses.
    t=frame/(FRAMES-1)
    if frame<=22:
        u=frame/22
        remaining=(1-u)**2.05
        rx=rotation([1,.33,.17],remaining*math.pi*4.35)
        rz=rotation([.15,.25,1],remaining*math.pi*2.2)
        r=rz @ rx @ target_rotation(face)
        height=.20*(1-u)*abs(math.sin(u*math.pi*3+.4))
        drift=np.array([.19*(1-u)*math.sin(u*math.pi*2),height,0.])
    elif frame<=28:
        u=(frame-22)/7
        wobble=math.radians(5.8)*(1-u)**2*math.sin(u*math.pi*2)
        r=rotation([.8,0,.35],wobble) @ target_rotation(face)
        drift=np.array([0.,.025*(1-u)*abs(math.sin(u*math.pi*2)),0.])
    else:
        r=target_rotation(face)
        drift=np.zeros(3)
    # Camera framing follows a stationary center; translation never clips die.
    return r, drift


def sdf(p, info=False):
    q=np.abs(p)-(1-RADIUS)
    outside=np.maximum(q,0)
    bd=np.linalg.norm(outside,axis=1)+np.minimum(np.max(q,axis=1),0)-RADIUS
    distance,index=TREE.query(p,workers=1)
    cavity=PIP_RADIUS-distance
    d=np.maximum(bd,cavity)
    if info: return d,bd,cavity,index,outside
    return d


def contact_shadow(pixels,hits,r,shift,size,samples):
    # Short-range ray-traced ambient contact occlusion on one world-space plane.
    # It deliberately omits a long dramatic cast shadow to keep the toy light.
    origin=pixels[:,0,None]*RIGHT + pixels[:,1,None]*UP + CAMERA*5
    ground_y=-1.02
    ray_t=(ground_y-origin[:,1])/(-CAMERA[1])
    world=origin-ray_t[:,None]*CAMERA
    near=np.sum((world[:,[0,2]]-shift[[0,2]])**2,axis=1)<2.20**2
    candidates=np.flatnonzero(near & ~hits)
    occlusion=np.zeros(len(pixels))
    fixtures=[[-.43,1.,.50],[-.10,1.,.14],[-.57,1.,.04],[.10,1.,.44]]
    for fixture in fixtures:
        direction=np.array(fixture,dtype=float); direction/=np.linalg.norm(direction)
        direction=direction @ r
        ids=candidates.copy(); travel=np.full(len(ids),.006)
        starts=(world[ids]-shift) @ r
        for _ in range(25):
            if not len(ids): break
            p=starts+travel[:,None]*direction
            d=sdf(p)
            blocked=d<.001
            occlusion[ids[blocked]]+=np.exp(-travel[blocked]*4.5)/len(fixtures)
            keep=~blocked & (travel<.48)
            ids=ids[keep]; starts=starts[keep]
            travel=travel[keep]+np.maximum(d[keep],.002)
    raw=np.clip(occlusion.reshape(size,size)*255*.16,0,255).astype(np.uint8)
    mask=Image.fromarray(raw,'L').filter(ImageFilter.GaussianBlur(1.35*samples))
    a=np.asarray(mask,dtype=float)
    margin=np.minimum(np.arange(size),np.arange(size)[::-1])
    fade=np.minimum(1,margin/(2.5*samples))
    a*=fade[:,None]*fade[None,:]
    shadow=Image.new('RGBA',(size,size),(48,59,67,0))
    shadow.putalpha(Image.fromarray(a.astype(np.uint8),'L'))
    return shadow


def render(face,frame,samples=SAMPLES,pose_override=None):
    size=SIZE*samples
    positions=(np.arange(size)+.5)/size*2*EXTENT-EXTENT
    xx,yy=np.meshgrid(positions,positions[::-1])
    pixels=np.stack([xx.ravel(),yy.ravel()],axis=1)
    r,shift=pose(face,frame) if pose_override is None else pose_override
    origins=(pixels[:,0,None]*RIGHT + pixels[:,1,None]*UP + CAMERA*5-shift) @ r
    direction=(-CAMERA) @ r
    light=LIGHT @ r
    view=CAMERA @ r
    # Start at entry to a loose bounding sphere, skip rays that miss entirely.
    b=origins@direction
    c=np.sum(origins**2,axis=1)-1.8**2
    disc=b*b-c
    valid=disc>=0
    ids=np.flatnonzero(valid)
    distance=-b[ids]-np.sqrt(np.maximum(disc[ids],0))
    hits=np.zeros(len(pixels),dtype=bool)
    hit_distance=np.zeros(len(pixels))
    for _ in range(92):
        if not len(ids): break
        point=origins[ids]+distance[:,None]*direction
        d=sdf(point)
        touched=d<.00065
        hits[ids[touched]]=True
        hit_distance[ids[touched]]=distance[touched]
        keep=~touched & (distance<8.1)
        ids=ids[keep]; distance=distance[keep]+np.maximum(d[keep],.00025)
    hit_ids=np.flatnonzero(hits)
    point=origins[hit_ids]+hit_distance[hit_ids,None]*direction
    _,bd,cavity,index,outside=sdf(point,True)
    is_pip=cavity>bd
    normal=outside*np.sign(point)
    normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-9)
    cavity_normal=CENTERS[index]-point
    cavity_normal/=np.maximum(np.linalg.norm(cavity_normal,axis=1,keepdims=True),1e-9)
    normal[is_pip]=cavity_normal[is_pip]
    base=np.tile(np.array([.965,.976,.990]),(len(point),1))
    base[is_pip]=[.018,.020,.025]
    ndl=np.maximum(normal@light,0)
    # True geometry occlusion toward area-light center, essential for pip lips.
    shadow=np.ones(len(point))
    candidate=np.flatnonzero((ndl>0)&is_pip)
    shadow_distance=np.full(len(candidate),.004)
    for _ in range(20):
        if not len(candidate): break
        q=point[candidate]+normal[candidate]*.002+shadow_distance[:,None]*light
        d=sdf(q)
        blocked=d<.0006
        shadow[candidate[blocked]]=.10
        keep=(~blocked)&(shadow_distance<.43)
        candidate=candidate[keep]
        shadow_distance=shadow_distance[keep]+np.maximum(d[keep],.003)
    hemisphere=np.clip(normal @ (np.array([0.,1.,0.]) @ r),-1,1)
    # Bright resin under broad key + front fill. Keep midtones luminous while
    # retaining clear adjacent-face values and depth in concave pip walls.
    fill=np.maximum(normal@(FILL_LIGHT@r),0)
    illumination=.54+.10*(hemisphere+1)/2+.26*ndl*shadow+.12*fill
    pip_ao=np.clip(1+bd*3.0,.57,1.)
    illumination[is_pip]*=pip_ao[is_pip]*.88
    color=base*illumination[:,None]
    glossy=reflected_softboxes(normal,view,r)
    glossy[is_pip]*=.36
    color+=glossy*shadow[:,None]
    halfvec=light+view; halfvec/=np.linalg.norm(halfvec)
    ndh=np.maximum(normal@halfvec,0)
    broad_sheen=(ndh**34)*.040*shadow
    broad_sheen[is_pip]*=.25
    color+=broad_sheen[:,None]*np.array([1.,.99,.96])
    # Fine edge definition, substantially lighter than the matte v1 outline.
    outline=np.clip((.12-np.maximum(normal@view,0))/.12,0,1)**1.6
    color*=1-.10*outline[:,None]
    # Only compress the brightest reflected light; preserve the pigment midtones.
    color=np.where(color>.93,.93+.07*(1-np.exp(-(color-.93)*10)),color)
    # Linear-light color -> sRGB.
    color=np.where(color<=.0031308,color*12.92,1.055*np.maximum(color,0)**(1/2.4)-.055)
    rgba=np.zeros((len(pixels),4),dtype=np.uint8)
    rgba[hit_ids,:3]=np.clip(color*255+.5,0,255).astype(np.uint8)
    rgba[hit_ids,3]=255
    img=Image.fromarray(rgba.reshape(size,size,4),'RGBA')
    img=Image.alpha_composite(contact_shadow(pixels,hits,r,shift,size,samples),img)
    if samples>1: img=img.resize((SIZE,SIZE),Image.Resampling.LANCZOS)
    return img


def render_job(job):
    face,frame=job
    started=time.monotonic()
    img=render(face,frame)
    path=ROOT/'frames'/f'die-{face}-{frame:02d}.png'
    img.save(path,optimize=True)
    return face,frame,round(time.monotonic()-started,2)


def generate_manifest():
    manifest={
        'schemaVersion':1,'materialVersion':3,'renderer':'CPU orthographic ray tracing of rounded-box minus spherical pip cavities',
        'frameWidth':SIZE,'frameHeight':SIZE,'columns':8,'rows':4,
        'frameCount':FRAMES,'totalFrames':FRAMES,'landingFrame':31,'firstFlatFrame':22,'trailingDuplicateFrames':2,'trailingStaticFrames':3,'fps':FPS,'durationMs':round(FRAMES*1000/FPS),
        'anchor':{'x':.5,'y':.5},'anchorPixels':{'x':SIZE/2,'y':SIZE/2},'alpha':True,'trajectoryCount':1,
        'coordinateSystem':{'up':'+Y','faceNormals':{str(k):v[0].tolist() for k,v in FACES.items()}},
        'oppositePairs':[[1,6],[2,5],[3,4]],
        'camera':{'projection':'orthographic','towardCamera':CAMERA.tolist(),'screenRight':RIGHT.tolist(),'screenUp':UP.tolist()},
        'light':{'type':'fixed studio key, fill and reflected rectangular softboxes','towardLight':LIGHT.tolist(),'fill':FILL_LIGHT.tolist(),'softboxes':SOFTBOXES},
        'material':{'body':'cool white polished resin with broad softbox reflections','pips':'21 deep black recessed cavities','roundedEdgeRadius':RADIUS,'reflectionMethod':'surface-normal reflection vectors into fixed rectangular environment fixtures','contactShadow':'short-range ray-traced ambient occlusion on fixed world ground plane; four upper-left samples; soft reconstruction'},
        'phases':[{'name':'tumble','firstFrame':0,'lastFrame':11},{'name':'decelerate','firstFrame':12,'lastFrame':22},{'name':'wobble','firstFrame':23,'lastFrame':28},{'name':'settled','firstFrame':29,'lastFrame':31}],
        'sequences':[]}
    for face in range(1,7):
        sequence={'id':f'roll-to-{face}','result':face,'trajectory':1,
                  'atlas':f'roll-{face}.webp','atlasPng':f'roll-{face}.png',
                  'still':f'idle-{face}.png','totalFrames':FRAMES,'landingFrame':31,'fps':FPS,'frames':[]}
        for frame in range(FRAMES):
            r,shift=pose(face,frame)
            sequence['frames'].append({'index':frame,'x':(frame%8)*SIZE,'y':(frame//8)*SIZE,
                                       'width':SIZE,'height':SIZE,'durationMs':1000/FPS,
                                       'rotationMatrix':np.round(r,7).tolist(),'translation':np.round(shift,7).tolist()})
        manifest['sequences'].append(sequence)
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')


def assemble():
    board=Image.new('RGB',(6*192,192*2),(229,237,241))
    draw=ImageDraw.Draw(board)
    for face in range(1,7):
        atlas=Image.new('RGBA',(SIZE*8,SIZE*4))
        for frame in range(FRAMES):
            im=Image.open(ROOT/'frames'/f'die-{face}-{frame:02d}.png')
            atlas.alpha_composite(im,((frame%8)*SIZE,(frame//8)*SIZE))
        atlas.save(ROOT/f'roll-{face}.png',optimize=True)
        atlas.save(ROOT/f'roll-{face}.webp',lossless=True,method=6)
        still=Image.open(ROOT/'frames'/f'die-{face}-31.png')
        still.save(ROOT/f'idle-{face}.png',optimize=True)
        for row,fr in enumerate((31,9)):
            im=Image.open(ROOT/'frames'/f'die-{face}-{fr:02d}.png')
            board.paste(im,((face-1)*192+16,row*192+20),im)
            draw.text(((face-1)*192+10,row*192+8),f'TOP {face}' if row==0 else f'TUMBLE {face} / 09',fill=(45,63,83))
    board.save(ROOT/'contact-sheet.png')
    generate_manifest()
    validate_assets()


def validate_assets():
    report={'materialVersion':3,'geometryChecks':'passed','sourceFrameCount':0,'frameSize':[SIZE,SIZE],
            'atlasSize':[SIZE*8,SIZE*4],'emptyOuterBorders':True,'finalStaticEquality':True,'atlases':[]}
    for face in range(1,7):
        for frame in range(FRAMES):
            im=Image.open(ROOT/'frames'/f'die-{face}-{frame:02d}.png').convert('RGBA')
            assert im.size==(SIZE,SIZE)
            alpha=np.array(im.getchannel('A'))
            assert not np.any(alpha[0]) and not np.any(alpha[-1]) and not np.any(alpha[:,0]) and not np.any(alpha[:,-1]), (face,frame,'clipped border')
            assert np.any(alpha==255) and np.any(alpha==0)
            report['sourceFrameCount']+=1
        final=np.array(Image.open(ROOT/'frames'/f'die-{face}-31.png'))
        still=np.array(Image.open(ROOT/f'idle-{face}.png'))
        assert np.array_equal(final,still)
        path=ROOT/f'roll-{face}.webp'
        atlas=Image.open(path)
        assert atlas.size==(SIZE*8,SIZE*4)
        visible=still[:,:,3]>0
        encoded_final=np.array(atlas.convert('RGBA').crop((7*SIZE,3*SIZE,8*SIZE,4*SIZE)))
        assert np.array_equal(encoded_final[visible],still[visible]), (face,'WebP final changed')
        assert path.stat().st_size<1_000_000, (path,'atlas exceeds budget')
        report['atlases'].append({'file':path.name,'bytes':path.stat().st_size,
                                 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    previous_path=ROOT/'versions/v1-matte/manifest.json'
    if previous_path.exists():
        old=json.loads(previous_path.read_text())
        new=json.loads((ROOT/'manifest.json').read_text())
        for key in ['frameWidth','frameHeight','columns','rows','totalFrames','fps','landingFrame','anchor','oppositePairs','coordinateSystem','phases']:
            assert old[key]==new[key], ('v1 contract changed',key)
        assert old['sequences']==new['sequences'], 'v1 frame sequence or poses changed'
        report['v1Compatibility']={'dimensions':True,'timing':True,'faceMapping':True,'allMainPoses':True,'anchors':True}
    report['webpFinalVisiblePixelsEqualPng']=True
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Validated 192 alpha frames; no clipping; final stills match; all atlases below 1 MB.',flush=True)


def render_extras():
    extras=[]
    for name,count,columns,loop in [('spin-32',32,8,True),('wobble-12',12,6,False)]:
        rows=(count+columns-1)//columns
        atlas=Image.new('RGBA',(columns*SIZE,rows*SIZE))
        frame_meta=[]
        for frame in range(count):
            if loop:
                u=frame/count
                r=rotation([.7,.23,1],2*math.pi*u) @ rotation([1,.1,.2],2*math.pi*u) @ target_rotation(1)
            else:
                u=frame/(count-1)
                angle=math.radians(7.2)*math.sin(u*math.pi*2)*(1-u)**1.5
                r=rotation([.8,0,.35],angle) @ target_rotation(1)
            img=render(1,frame,pose_override=(r,np.zeros(3)))
            img.save(ROOT/'frames'/f'{name}-{frame:02d}.png',optimize=True)
            atlas.alpha_composite(img,((frame%columns)*SIZE,(frame//columns)*SIZE))
            alpha=np.array(img.getchannel('A'))
            assert not np.any(alpha[0]) and not np.any(alpha[-1]) and not np.any(alpha[:,0]) and not np.any(alpha[:,-1])
            frame_meta.append({'index':frame,'x':(frame%columns)*SIZE,'y':(frame//columns)*SIZE,
                               'width':SIZE,'height':SIZE,'durationMs':1000/FPS,'rotationMatrix':np.round(r,7).tolist()})
        path=ROOT/f'{name}.webp'
        atlas.save(path,lossless=True,method=6)
        assert path.stat().st_size<1_000_000
        extras.append({'id':name,'atlas':path.name,'result':1 if not loop else None,
                       'frameWidth':SIZE,'frameHeight':SIZE,'columns':columns,'rows':rows,
                       'totalFrames':count,'fps':FPS,'loop':loop,'anchor':{'x':.5,'y':.5},
                       'landingFrame':None if loop else count-1,'frames':frame_meta})
        print('Auxiliary atlas',path.name,path.stat().st_size,'bytes',flush=True)
    manifest=json.loads((ROOT/'manifest.json').read_text())
    manifest['auxiliarySequences']=extras
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    report=json.loads((ROOT/'validation.json').read_text())
    report['auxiliaryFrameCount']=44
    report['auxiliaryAtlases']=[{'file':item['atlas'],'bytes':(ROOT/item['atlas']).stat().st_size,
                                'sha256':hashlib.sha256((ROOT/item['atlas']).read_bytes()).hexdigest()} for item in extras]
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')


def validate_auxiliary_assets():
    manifest=json.loads((ROOT/'manifest.json').read_text())
    report=json.loads((ROOT/'validation.json').read_text())
    extras=manifest['auxiliarySequences']
    for sequence in extras:
        for frame in sequence['frames']:
            path=ROOT/'frames'/f"{sequence['id']}-{frame['index']:02d}.png"
            im=Image.open(path).convert('RGBA')
            assert im.size==(SIZE,SIZE)
            a=np.array(im.getchannel('A'))
            assert not np.any(a[0]) and not np.any(a[-1]) and not np.any(a[:,0]) and not np.any(a[:,-1])
        path=ROOT/sequence['atlas']
        assert path.stat().st_size<1_000_000
        assert Image.open(path).size==(sequence['columns']*SIZE,sequence['rows']*SIZE)
    assert np.array_equal(np.array(Image.open(ROOT/'frames/wobble-12-11.png')),np.array(Image.open(ROOT/'idle-1.png')))
    previous=ROOT/'versions/v1-matte/manifest.json'
    if previous.exists():
        old=json.loads(previous.read_text())
        assert old['auxiliarySequences']==extras, 'v1 auxiliary frames or poses changed'
        report.setdefault('v1Compatibility',{})['allAuxiliaryPoses']=True
    report['auxiliaryFrameCount']=sum(item['totalFrames'] for item in extras)
    report['auxiliaryAtlases']=[{'file':item['atlas'],'bytes':(ROOT/item['atlas']).stat().st_size,
                                'sha256':hashlib.sha256((ROOT/item['atlas']).read_bytes()).hexdigest()} for item in extras]
    report['wobbleReturnsExactlyToIdle']=True
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')


def generate_comparison():
    validate_auxiliary_assets()
    previous=ROOT/'versions/v1-matte'
    if not previous.exists(): return
    board=Image.new('RGB',(1280,840),'#DCECF9')
    draw=ImageDraw.Draw(board)
    font_path=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
    font=ImageFont.truetype(str(font_path),22) if font_path.exists() else ImageFont.load_default()
    for row,(folder,label) in enumerate([(previous,'V1  /  MATTE'),(ROOT,'V2  /  GLOSSY RESIN')]):
        draw.text((38,24+row*414),label,font=font,fill='#30425C')
        for col,(face,frame) in enumerate([(1,31),(6,31),(3,9)]):
            im=Image.open(folder/'frames'/f'die-{face}-{frame:02d}.png').resize((320,320),Image.Resampling.LANCZOS)
            board.paste(im,(38+col*422,66+row*414),im)
    board.save(ROOT/'material-comparison-v1-v2.png')
    # Avoid retaining the early preview comparison with pre-contract v1 poses.
    board.resize((960,630),Image.Resampling.LANCZOS).save(ROOT/'material-comparison-preview.png')
    print('Saved matching-pose v1/v2 comparison on #DCECF9.',flush=True)


def verify():
    # Geometric assertions are independent of visual decoration.
    for face in range(1,7):
        assert int(np.sum(PIP_FACE==face))==face
        assert np.allclose(target_rotation(face)@FACES[face][0],[0,1,0],atol=1e-8)
        final,_=pose(face,31)
        assert np.allclose(final@FACES[face][0],[0,1,0],atol=1e-8)
    for a,b in ((1,6),(2,5),(3,4)):
        assert np.allclose(FACES[a][0],-FACES[b][0])
    assert len(CENTERS)==21
    print('Geometry assertions passed: six pip counts, three opposite pairs, six final top faces.',flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--preview',action='store_true')
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--assemble-only',action='store_true')
    parser.add_argument('--extras-only',action='store_true')
    parser.add_argument('--runtime-only',action='store_true',help='Build and copy the six game atlases, without auxiliary concept assets')
    args=parser.parse_args()
    verify()
    (ROOT/'frames').mkdir(exist_ok=True)
    if args.extras_only:
        render_extras()
        generate_comparison()
        return
    if args.preview:
        for face,frame in [(1,31),(6,31),(3,9)]:
            start=time.monotonic(); render(face,frame).save(ROOT/f'preview-{face}-{frame}.png')
            print('Preview',face,frame,round(time.monotonic()-start,2),'seconds',flush=True)
        return
    if not args.assemble_only:
        jobs=[(face,frame) for face in range(1,7) for frame in range(FRAMES)]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            for count,result in enumerate(pool.map(render_job,jobs),1):
                if count%8==0: print(f'Rendered {count}/{len(jobs)}: {result}',flush=True)
    assemble()
    if args.runtime_only:
        runtime=ROOT.parent/'runtime/assets/dice-3d'
        runtime.mkdir(parents=True,exist_ok=True)
        for path in sorted(ROOT.glob('roll-*.webp')):
            shutil.copy2(path,runtime/path.name)
            print('Copied',runtime/path.name,path.stat().st_size,'bytes',flush=True)
        return
    render_extras()
    generate_comparison()
    for path in sorted(ROOT.glob('roll-*.webp')): print(path.name,path.stat().st_size,'bytes',flush=True)

if __name__=='__main__': main()

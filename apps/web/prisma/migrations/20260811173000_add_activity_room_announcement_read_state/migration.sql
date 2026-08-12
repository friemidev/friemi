-- Track the latest group announcement a room member has acknowledged.

ALTER TABLE "ActivityRoomReadState"
ADD COLUMN "announcementReadAt" TIMESTAMP(3);

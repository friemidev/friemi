"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ViewerProfileContextValue = {
  nickname: string;
  nicknameResolved: boolean;
  setNickname: (nickname: string) => void;
};

const ViewerProfileContext = createContext<ViewerProfileContextValue | null>(
  null,
);

type ViewerProfileProviderProps = {
  children: ReactNode;
  initialNickname?: string | null;
};

export function ViewerProfileProvider({
  children,
  initialNickname = null,
}: ViewerProfileProviderProps) {
  const normalizedInitialNickname = initialNickname?.trim() ?? "";
  const [nickname, setNicknameState] = useState(normalizedInitialNickname);

  const setNickname = useCallback((nextNickname: string) => {
    setNicknameState(nextNickname.trim());
  }, []);

  useEffect(() => {
    if (!normalizedInitialNickname) {
      return;
    }

    setNicknameState((currentNickname) =>
      currentNickname === normalizedInitialNickname
        ? currentNickname
        : normalizedInitialNickname,
    );
  }, [normalizedInitialNickname]);

  const resolvedNickname = nickname || normalizedInitialNickname;

  const value = useMemo<ViewerProfileContextValue>(
    () => ({
      nickname: resolvedNickname,
      nicknameResolved: resolvedNickname.length > 0,
      setNickname,
    }),
    [resolvedNickname, setNickname],
  );

  return (
    <ViewerProfileContext.Provider value={value}>
      {children}
    </ViewerProfileContext.Provider>
  );
}

export function useViewerProfile() {
  const context = useContext(ViewerProfileContext);

  if (!context) {
    return {
      nickname: "",
      nicknameResolved: false,
      setNickname: () => {},
    };
  }

  return context;
}

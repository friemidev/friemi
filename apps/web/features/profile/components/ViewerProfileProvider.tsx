"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  const [nickname, setNicknameState] = useState(initialNickname?.trim() ?? "");

  const setNickname = useCallback((nextNickname: string) => {
    setNicknameState(nextNickname.trim());
  }, []);

  const value = useMemo<ViewerProfileContextValue>(
    () => ({
      nickname,
      nicknameResolved: nickname.length > 0,
      setNickname,
    }),
    [nickname, setNickname],
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

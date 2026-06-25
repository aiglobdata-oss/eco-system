import React from "react";

export type EcosystemProfile = {
  name: string;
  city: string;
  email: string;
  phoneMain: string;
  phoneExtra?: string;
  address?: string;
  avatarUri?: string;
} | null;

export type EcosystemContextValue = {
  profile: EcosystemProfile;
  setProfile: (profile: EcosystemProfile) => void;
};

export const EcosystemContext = React.createContext<EcosystemContextValue>({
  profile: null,
  setProfile: () => {},
});

export default EcosystemContext;

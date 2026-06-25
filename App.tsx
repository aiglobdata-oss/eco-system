import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PreviewScreen from "./components/PreviewScreen";
import SdelaiZaApp from "./sdelaiZa/SdelaiZaApp";
import SlediZaApp from "./slediZa/SlediZaApp";
import ZadrugimApp from "./zadrugim/ZadrugimApp";
import { EcosystemContext, type EcosystemProfile } from "./EcosystemContext";

export type RootStackParamList = {
  Preview: undefined;
  SdelaiZa: undefined;
  SlediZa: undefined;
  Zadrugim: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [profile, setProfile] = useState<EcosystemProfile>(null);

  return (
    <EcosystemContext.Provider value={{ profile, setProfile }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Preview" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Preview" component={PreviewScreen} />
          <Stack.Screen name="SdelaiZa" component={SdelaiZaApp} />
          <Stack.Screen name="SlediZa" component={SlediZaApp} />
          <Stack.Screen name="Zadrugim" component={ZadrugimApp} />
        </Stack.Navigator>
      </NavigationContainer>
    </EcosystemContext.Provider>
  );
}

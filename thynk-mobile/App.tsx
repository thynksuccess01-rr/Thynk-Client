import React from "react";
import { Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/lib/auth";
import type { RootStackParamList } from "./src/nav";
import { C, Loading } from "./src/ui";
import LoginScreen from "./src/screens/LoginScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import PeriodsScreen from "./src/screens/PeriodsScreen";
import PeriodScreen from "./src/screens/PeriodScreen";
import CampaignFormScreen from "./src/screens/CampaignFormScreen";
import LeadFormScreen from "./src/screens/LeadFormScreen";
import LeadDetailScreen from "./src/screens/LeadDetailScreen";
import ClientHomeScreen from "./src/screens/ClientHomeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={10}>
      <Text style={{ color: C.accent, fontWeight: "700" }}>Sign out</Text>
    </Pressable>
  );
}

function Routes() {
  const { loading, profile } = useAuth();
  if (loading) return <Loading />;
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: C.ink, headerTitleStyle: { fontWeight: "700" } }}>
      {!profile ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : profile.role === "admin" ? (
        <>
          <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: "Data Panel", headerRight: () => <SignOutButton /> }} />
          <Stack.Screen name="Periods" component={PeriodsScreen} options={({ route }) => ({ title: route.params.clientName })} />
          <Stack.Screen name="Period" component={PeriodScreen} options={{ title: "Period" }} />
          <Stack.Screen name="CampaignForm" component={CampaignFormScreen} options={{ title: "Campaign entry" }} />
          <Stack.Screen name="LeadForm" component={LeadFormScreen} options={{ title: "Lead" }} />
          <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: "Lead details" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: "My Leads", headerRight: () => <SignOutButton /> }} />
          <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: "Lead details" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

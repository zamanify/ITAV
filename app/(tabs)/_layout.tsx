import { Tabs } from 'expo-router';
import { User, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF69B4',
        tabBarStyle: { display: 'none' },  // ← dölj hela footern
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="villagers/index"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="groups/index"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="create-hood"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="create-request"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="create-offer"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
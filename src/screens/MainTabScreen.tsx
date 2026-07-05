import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, IconButton, Avatar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { logout } from '../redux/authSlice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

import DashboardScreen from './DashboardScreen.tsx';
import ExpenseListScreen from './ExpenseListScreen.tsx';
import ChatScreen from './ChatScreen.tsx';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export default function MainTabScreen({ route, navigation }: Props) {
  const initialTab = route.params?.initialTab || 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'chat'>(initialTab);

  const email = useSelector((state: RootState) => state.auth.email);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen navigation={navigation} />;
      case 'expenses':
        return <ExpenseListScreen navigation={navigation} />;
      case 'chat':
        return <ChatScreen />;
      default:
        return <DashboardScreen navigation={navigation} />;
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Overview';
      case 'expenses':
        return 'Expenses';
      case 'chat':
        return 'AI Assistant';
      default:
        return 'Overview';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerLeft}>
          <Avatar.Text
            size={36}
            label={email ? email.substring(0, 2).toUpperCase() : 'US'}
            style={styles.avatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            <Text style={styles.headerSub}>{email || 'User'}</Text>
          </View>
        </View>
        <IconButton icon="logout" iconColor="#FF4A4A" size={24} onPress={handleLogout} />
      </Surface>

      {/* Screen Area */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Custom Floating Bottom Tab Bar */}
      <Surface style={styles.tabBar} elevation={4}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.7}
        >
          <IconButton
            icon="view-dashboard"
            iconColor={activeTab === 'dashboard' ? '#6C63FF' : '#A0A0C0'}
            size={24}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeTabLabel]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('expenses')}
          activeOpacity={0.7}
        >
          <IconButton
            icon="format-list-bulleted"
            iconColor={activeTab === 'expenses' ? '#6C63FF' : '#A0A0C0'}
            size={24}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabLabel, activeTab === 'expenses' && styles.activeTabLabel]}>
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.7}
        >
          <IconButton
            icon="robot"
            iconColor={activeTab === 'chat' ? '#6C63FF' : '#A0A0C0'}
            size={24}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.activeTabLabel]}>
            AI Chat
          </Text>
        </TouchableOpacity>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C', // Sleek dark mode background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#252538',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#A0A0C0',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 70 : 60,
    backgroundColor: '#252538',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    margin: 0,
    padding: 0,
    height: 30,
  },
  tabLabel: {
    fontSize: 11,
    color: '#A0A0C0',
  },
  activeTabLabel: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
});

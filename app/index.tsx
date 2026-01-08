import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Bike, 
  Footprints, 
  Clock,
  Route,
  Compass,
  TrendingUp,
  Trophy,
  Star,
  Award,
  Settings,
  LogOut,
  Camera,
  MessageCircle,
  X,
  Send
} from 'lucide-react-native';
import * as React from 'react';
import { 
  View, 
  Text,
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBaseUrl } from '@/lib/api';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

interface UserStats {
  rank: number;
  points: number;
  xp: number;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { signOut } = useAuth();
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const chatScaleAnim = React.useRef(new Animated.Value(0)).current;
  const chatOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Your Google AI Studio (Gemini) API key
  const AskAI = 'my api keyy ';

  // System instruction prompts for training the AI model
  const systemInstruction = `
You are D-RSI Assistant, a helpful and friendly AI assistant for the D-RSI navigation app.
Your primary role is to help users with:
- Navigation and route planning questions
- Road safety information and tips
- Traffic updates and travel advice
- General questions about the app features
- Quiz and learning content related to road safety

Guidelines:
- Be concise and clear in your responses
- Use a friendly and professional tone
- If asked about navigation, provide helpful tips
- For road safety questions, prioritize accurate information
- Keep responses short and mobile-friendly (under 200 words when possible)
- Use emojis sparingly to be friendly 🚗
- If you don't know something, admit it honestly
- Never provide dangerous or illegal driving advice
  `.trim();

  // Track if welcome message has been shown
  const [hasShownWelcome, setHasShownWelcome] = React.useState(false);

  React.useEffect(() => {
    if (isSettingsOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [isSettingsOpen]);

  React.useEffect(() => {
    if (isChatOpen) {
      Animated.parallel([
        Animated.spring(chatScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(chatOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(chatScaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(chatOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isChatOpen]);

  const fetchStats = React.useCallback(async () => {
    if (!user) return;
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/rankings?clerkId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.userStats) {
          setStats(data.userStats);
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      fetchStats();
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [user, isLoaded, fetchStats]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const sendMessageToAI = async (messageText: string) => {
    if (!messageText.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      // Replace this URL with your actual AI API endpoint
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${AskAI}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: messageText }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.candidates[0]?.content?.parts[0]?.text || 'I received your message!',
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error Response:', errorData);
        throw new Error(`Failed to get AI response: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#800000" />
      </View>
    );
  }

  const greeting = getGreeting();
  const firstName = user?.firstName || 'Traveler';

  const quickActions = [
    { icon: Navigation, label: 'Navigate', color: '#007AFF', onPress: () => router.push('/search') },
    { icon: Car, label: 'By Car', color: '#10b981', onPress: () => router.push('/search') },
    { icon: Bike, label: 'By Bike', color: '#FF9500', onPress: () => router.push('/search') },
    { icon: Footprints, label: 'Walk', color: '#8B5CF6', onPress: () => router.push('/search') },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#800000']} />
        }
      >
        {/* Gradient Background */}
        <View className="absolute top-0 left-0 right-0" style={{ height: 500, zIndex: 0 }}>
          <LinearGradient
            colors={['#800020', '#4A90E2', 'rgba(249, 250, 251, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1, opacity: 0.7 }}
          />
        </View>

        {/* Header Section */}
        <View className="px-6 pt-16 pb-6 relative" style={{ zIndex: 1 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center flex-wrap mb-2">
                <Text className="text-3xl font-light text-gray-200 mr-2">{greeting},</Text>
                <Text className="text-3xl font-semibold text-gray-100">{firstName}</Text>
              </View>
              <Text className="text-base text-gray-200 mt-1">Where would you like to go today?</Text>
            </View>
            
            <View className="z-50 mr-2">
              <TouchableOpacity 
                onPress={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 bg-gray-300 rounded-full shadow-sm border border-gray-100"
              >
                <Settings size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* User Stats Card */}
        {stats && (
          <View className="mx-5 mb-6 rounded-2xl overflow-hidden shadow-lg border border-white/20">
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-5"
            >
              <Text className="text-lg font-bold text-gray-800 mb-4">Your Progress</Text>
              <View className="flex-row justify-between">
                
                {/* Rank */}
                <View className="flex-1 items-center border-r border-gray-200">
                  <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mb-2">
                    <Trophy size={20} color="#CA8A04" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900">
                    {stats.rank > 0 ? `#${stats.rank}` : '-'}
                  </Text>
                  <Text className="text-xs text-gray-500 font-medium">Quiz Rank</Text>
                </View>

                {/* Quiz Points */}
                <View className="flex-1 items-center border-r border-gray-200">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-2">
                    <Star size={20} color="#2563EB" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900">{stats.points}</Text>
                  <Text className="text-xs text-gray-500 font-medium">Quiz Points</Text>
                </View>

                {/* XP */}
                <View className="flex-1 items-center">
                  <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mb-2">
                    <Award size={20} color="#9333EA" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900">{stats.xp}</Text>
                  <Text className="text-xs text-gray-500 font-medium">Total XP</Text>
                </View>

              </View>
            </LinearGradient>
          </View>
        )}

        {/* Main Search Card */}
        <TouchableOpacity 
          className="mx-5 my-4 rounded-3xl overflow-hidden shadow-lg shadow-blue-500/30"
          onPress={() => router.push('/search')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#007AFF', '#0055CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6"
          >
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mr-4">
                <MapPin size={32} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-white mb-1">Search Destination</Text>
                <Text className="text-sm text-white/80">Find the fastest route to anywhere</Text>
              </View>
              <Compass size={24} color="rgba(255,255,255,0.5)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View className="mt-4 px-5">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</Text>
          <View className="flex-row justify-between">
            {quickActions.map((action, index) => (
              <TouchableOpacity 
                key={index}
                className="items-center w-[22%]"
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View 
                  className="w-14 h-14 rounded-2xl items-center justify-center mb-2"
                  style={{ backgroundColor: action.color + '15' }}
                >
                  <action.icon size={24} color={action.color} />
                </View>
                <Text className="text-xs font-medium text-gray-600 text-center">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats / Info Cards */}
        <View className="flex-row px-5 mt-6 gap-4">
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-3">
              <Route size={20} color="#007AFF" />
              <Text className="ml-2 text-sm font-medium text-gray-500">Live Traffic</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Active</Text>
            <Text className="text-xs text-gray-500">Real-time updates</Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-3">
              <TrendingUp size={20} color="#10b981" />
              <Text className="ml-2 text-sm font-medium text-gray-500">Routes Today</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Ready</Text>
            <Text className="text-xs text-gray-500">Start navigating</Text>
          </View>
        </View>

        {/* Feature Highlight */}
        <View className="flex-row bg-white mx-5 mt-6 mb-8 rounded-2xl p-5 shadow-sm border border-gray-100">
          <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mr-4">
            <Clock size={28} color="#007AFF" />
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-base font-semibold text-gray-900 mb-1">Real-Time Navigation</Text>
            <Text className="text-sm text-gray-600 leading-5">
              Get the fastest routes with live traffic updates and accurate ETAs.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* AI Chat Button */}
      {!isChatOpen && (
        <Animated.View 
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <TouchableOpacity
            onPress={() => setIsChatOpen(true)}
            className="w-16 h-16 rounded-full shadow-lg"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#0055CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MessageCircle size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* AI Chat Modal */}
      <Modal
        visible={isChatOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsChatOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <TouchableWithoutFeedback onPress={() => setIsChatOpen(false)}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <Animated.View
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 350,
                height: 500,
                opacity: chatOpacityAnim,
                transform: [
                  { scale: chatScaleAnim },
                  {
                    translateX: chatScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  },
                  {
                    translateY: chatScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Chat Header */}
              <LinearGradient
                colors={['#007AFF', '#0055CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                    <MessageCircle size={20} color="#fff" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">AI Assistant</Text>
                    <Text className="text-white/80 text-xs">Ask me anything</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              {/* Messages Area */}
              <ScrollView
                ref={scrollViewRef}
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {messages.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-10">
                    <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                      <MessageCircle size={32} color="#007AFF" />
                    </View>
                    <Text className="text-gray-500 text-center text-sm">
                      Start a conversation with AI
                    </Text>
                  </View>
                ) : (
                  messages.map((message) => (
                    <View
                      key={message.id}
                      className={`mb-3 ${message.isUser ? 'items-end' : 'items-start'}`}
                    >
                      <View
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          message.isUser
                            ? 'bg-blue-500 rounded-br-sm'
                            : 'bg-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            message.isUser ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {message.text}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
                {isSending && (
                  <View className="items-start mb-3">
                    <View className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
                      <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Area */}
              <View className="border-t border-gray-200 p-3 flex-row items-center">
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-900 mr-2"
                  multiline
                  maxLength={500}
                  onSubmitEditing={() => sendMessageToAI(inputText)}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  onPress={() => sendMessageToAI(inputText)}
                  disabled={!inputText.trim() || isSending}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    inputText.trim() && !isSending ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSettingsOpen(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={{ 
                  transform: [{ translateY: slideAnim }]
                }}
                className="bg-white rounded-t-3xl"
              >
                <View className="p-6 pb-8">
                  {/* Handle Bar */}
                  <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />
                  
                  <Text className="text-xl font-bold text-gray-900 mb-6">Settings</Text>

                  {/* Change Photo Option */}
                  <TouchableOpacity 
                    className="flex-row items-center p-4 rounded-2xl bg-gray-50 active:bg-gray-100 mb-3"
                    onPress={() => {
                      setIsSettingsOpen(false);
                    }}
                  >
                    <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                      <Camera size={24} color="#007AFF" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">Change Photo</Text>
                      <Text className="text-sm text-gray-500 mt-0.5">Update your profile picture</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Log Out Option */}
                  <TouchableOpacity 
                    className="flex-row items-center p-4 rounded-2xl bg-red-50 active:bg-red-100"
                    onPress={async () => {
                      setIsSettingsOpen(false);
                      await signOut();
                    }}
                  >
                    <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mr-4">
                      <LogOut size={24} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-red-600">Log Out</Text>
                      <Text className="text-sm text-red-400 mt-0.5">Sign out of your account</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
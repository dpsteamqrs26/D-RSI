// app/ranking.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { getBaseUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface UserRanking {
  userId: string;
  userName: string;
  userEmail: string;
  totalCorrectAnswers: number;
  rank: number;
  imageUrl?: string;
}

export default function RankingScreen() {
  const [topRankers, setTopRankers] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setError(null);
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/rankings`;
      
      console.log('=== Fetching rankings ===');
      console.log('Base URL:', baseUrl);
      console.log('Full URL:', url);
      setDebugInfo(`Fetching from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('Response text (first 500 chars):', responseText.substring(0, 500));
      
      if (!response.ok) {
        console.error('Error response:', responseText);
        
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText.substring(0, 100);
        }
        
        setError(errorMessage);
        setDebugInfo(`Error ${response.status}: ${errorMessage}`);
        throw new Error(`Failed to fetch rankings: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Invalid JSON response from server');
        setDebugInfo(`Parse error: ${responseText.substring(0, 200)}`);
        throw new Error('Invalid JSON response');
      }
      
      console.log('Rankings data:', JSON.stringify(data, null, 2));
      
      if (data.error) {
        setError(data.error);
        setDebugInfo(`API Error: ${data.details || data.error}`);
      } else {
        setTopRankers(data.topRankers || []);
        setDebugInfo(`Successfully loaded ${data.topRankers?.length || 0} rankers`);
        
        if (data.message) {
          console.log('Message from API:', data.message);
        }
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setDebugInfo(`Catch error: ${errorMessage}`);
      
      Alert.alert(
        'Error Loading Rankings', 
        errorMessage + '\n\nCheck console for details',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRankings();
    setRefreshing(false);
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  // Function to get initials from userName
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="text-gray-600 mt-4">{t('fetchingRankings')}</Text>
        {debugInfo && (
          <Text className="text-xs text-gray-400 mt-2 px-4 text-center">
            {debugInfo}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1 p-4 pt-16"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Error Display */}
        {error && (
          <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
            <Text className={`text-red-900 font-bold text-base mb-2 ${isRTL ? 'text-right' : ''}`}>
              ⚠️ {t('errorLoadingRankings')}
            </Text>
            <Text className={`text-red-800 text-sm mb-3 ${isRTL ? 'text-right' : ''}`}>{error}</Text>
            <TouchableOpacity
              onPress={loadRankings}
              className="bg-red-600 p-3 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                {t('retry')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Debug Info - Remove this in production */}
        {__DEV__ && debugInfo && (
          <View className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
            <Text className="text-yellow-900 font-semibold text-xs mb-1">
              Debug Info:
            </Text>
            <Text className="text-yellow-800 text-xs">{debugInfo}</Text>
          </View>
        )}

        {/* All Rankers */}
        <View className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {topRankers.length === 0 ? (
            <View className="p-8 items-center">
              <Text className="text-6xl mb-4">📝</Text>
              <Text className="text-gray-900 font-bold text-lg mb-2">
                {t('noRankingsYet')}
              </Text>
              <Text className="text-gray-500 text-center">
                {t('claimTopSpot')}
              </Text>
            </View>
          ) : (
            topRankers.map((ranker, index) => {
              const medal = getMedalEmoji(ranker.rank);

              return (
                <View
                  key={ranker.userId}
                  className={`flex-row items-center p-3 ${
                    index < topRankers.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={
                    ranker.rank === 1
                      ? { backgroundColor: '#FFF9E6' }
                      : ranker.rank === 2
                      ? { backgroundColor: '#F5F5F5' }
                      : ranker.rank === 3
                      ? { backgroundColor: '#FFF4E6' }
                      : { backgroundColor: '#FFFFFF' }
                  }
                >
                  {/* Rank with Medal */}
                  <View className="w-12 items-center">
                    {medal ? (
                      <Text className="text-2xl">{medal}</Text>
                    ) : (
                      <View className="bg-gray-200 w-8 h-8 rounded-full items-center justify-center">
                        <Text className="text-gray-700 font-bold text-sm">
                          {ranker.rank}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Profile Picture */}
                  <View className={isRTL ? 'mr-2' : 'ml-2'}>
                    {ranker.imageUrl ? (
                      <Image
                        source={{ uri: ranker.imageUrl }}
                        className="w-10 h-10 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-purple-500 items-center justify-center">
                        <Text className="text-white font-bold text-sm">
                          {getInitials(ranker.userName)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* User Info */}
                  <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                    <Text
                      className={`font-semibold text-base text-gray-900 ${isRTL ? 'text-right' : ''}`}
                      numberOfLines={1}
                    >
                      {ranker.userName || (isRTL ? 'مجهول' : 'Anonymous')}
                    </Text>
                  </View>

                  {/* Correct Answers Count */}
                  <View className={`bg-green-100 px-3 py-2 rounded-lg ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    <Text className="text-green-900 font-bold text-lg text-center">
                      {ranker.totalCorrectAnswers}
                    </Text>
                    <Text className="text-green-700 text-xs text-center">
                      {t('correctCount')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Pull to Refresh Hint */}
        <View className="mt-4 p-3 bg-gray-100 rounded-xl">
          <Text className="text-gray-600 text-xs text-center">
            💡 {t('pullToRefresh')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
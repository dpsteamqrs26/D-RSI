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
  StyleSheet,
  Animated,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
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
  const [currentUserRank, setCurrentUserRank] = useState<UserRanking | null>(null);
  const scrollY = new Animated.Value(0);
  const { user } = useUser();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setError(null);
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/rankings`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const responseText = await response.text();
      
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
        throw new Error(`Failed to fetch rankings: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Invalid JSON response from server');
        throw new Error('Invalid JSON response');
      }
      
      if (data.error) {
        setError(data.error);
      } else {
        const rankers = data.topRankers || [];
        setTopRankers(rankers);
        
        // Find current user's rank
        if (user?.id) {
          const userRanking = rankers.find((r: UserRanking) => r.userId === user.id);
          if (userRanking) {
            setCurrentUserRank(userRanking);
          }
        }
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      Alert.alert(
        'Error Loading Rankings', 
        errorMessage,
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

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getProfileImage = (ranker: UserRanking) => {
    // First try to get Clerk profile image if this is the current user
    if (user?.id === ranker.userId && user?.imageUrl) {
      return user.imageUrl;
    }
    
    // Then try the imageUrl from the ranking data
    if (ranker.imageUrl) {
      return ranker.imageUrl;
    }
    
    // Try to get email profile picture (Gmail, etc.)
    if (ranker.userEmail) {
      // You can use a service like Gravatar or similar
      // For now, we'll return null and show initials
      return null;
    }
    
    return null;
  };

  const getRankBadgeColors = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          gradient: ['#FFD700', '#FFA500'],
          text: '#8B4513',
          border: '#FFD700',
        };
      case 2:
        return {
          gradient: ['#C0C0C0', '#A8A8A8'],
          text: '#4A4A4A',
          border: '#C0C0C0',
        };
      case 3:
        return {
          gradient: ['#8B4513', '#6B3410'],
          text: '#FFFFFF',
          border: '#8B4513',
        };
      default:
        return {
          gradient: ['#F5F5F5', '#E8E8E8'],
          text: '#666666',
          border: '#E0E0E0',
        };
    }
  };

  const renderTopThree = () => {
    const topThree = topRankers.slice(0, 3);
    if (topThree.length === 0) return null;

    const first = topThree.find(r => r.rank === 1);
    const second = topThree.find(r => r.rank === 2);
    const third = topThree.find(r => r.rank === 3);

    return (
      <View className="px-4 pb-6">
        <View className={`flex-row items-end justify-center ${isRTL ? 'flex-row-reverse' : ''}`} style={{ height: 280 }}>
          {/* Second Place */}
          {second && (
            <View className="flex-1 items-center" style={{ marginBottom: 20 }}>
              <View className="relative">
                <View style={styles.rankBadge2}>
                  <Text className="text-white font-bold text-xs">2</Text>
                </View>
                {getProfileImage(second) ? (
                  <Image
                    source={{ uri: getProfileImage(second)! }}
                    className="w-20 h-20 rounded-full"
                    style={styles.secondPlaceImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.secondPlaceAvatar}>
                    <Text className="text-white font-bold text-xl">
                      {getInitials(second.userName)}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-800 font-bold text-sm mt-3" numberOfLines={1}>
                {second.userName || 'Anonymous'}
              </Text>
              <View className="bg-gray-100 px-4 py-2 rounded-full mt-2">
                <Text className="text-gray-700 font-semibold text-base">
                  {second.totalCorrectAnswers}
                </Text>
              </View>
            </View>
          )}

          {/* First Place */}
          {first && (
            <View className="flex-1 items-center" style={{ marginBottom: 0 }}>
              <View className="relative">
                <View style={styles.crownBadge}>
                  <Text className="text-yellow-900 font-bold text-sm">👑</Text>
                </View>
                {getProfileImage(first) ? (
                  <View style={styles.firstPlaceImageContainer}>
                    <Image
                      source={{ uri: getProfileImage(first)! }}
                      className="w-28 h-28 rounded-full"
                      style={styles.firstPlaceImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.firstPlaceAvatar}>
                    <Text className="text-white font-bold text-2xl">
                      {getInitials(first.userName)}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-900 font-bold text-base mt-3" numberOfLines={1}>
                {first.userName || 'Anonymous'}
              </Text>
              <View style={styles.firstPlaceScoreBadge}>
                <Text className="text-yellow-900 font-bold text-lg">
                  {first.totalCorrectAnswers}
                </Text>
              </View>
            </View>
          )}

          {/* Third Place */}
          {third && (
            <View className="flex-1 items-center" style={{ marginBottom: 20 }}>
              <View className="relative">
                <View style={styles.rankBadge3}>
                  <Text className="text-white font-bold text-xs">3</Text>
                </View>
                {getProfileImage(third) ? (
                  <Image
                    source={{ uri: getProfileImage(third)! }}
                    className="w-20 h-20 rounded-full"
                    style={styles.thirdPlaceImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thirdPlaceAvatar}>
                    <Text className="text-white font-bold text-xl">
                      {getInitials(third.userName)}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-800 font-bold text-sm mt-3" numberOfLines={1}>
                {third.userName || 'Anonymous'}
              </Text>
              <View style={styles.thirdPlaceScoreBadge}>
                <Text className="text-amber-900 font-semibold text-base">
                  {third.totalCorrectAnswers}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-600 mt-4 font-medium">{t('fetchingRankings')}</Text>
      </View>
    );
  }

  // Header opacity animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1" style={styles.container}>
      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <Text className={`text-white font-bold text-3xl mb-2 ${isRTL ? 'text-right' : ''}`}>
          {t('leaderboard') || 'Leaderboard'}
        </Text>
        <Text className={`text-white text-base ${isRTL ? 'text-right' : ''}`} style={{ opacity: 0.9 }}>
          Top performers this season
        </Text>
      </Animated.View>

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            progressViewOffset={140}
          />
        }
      >
        {/* Spacer for sticky header */}
        <View style={{ height: 140 }} />

        {/* Error Display */}
        {error && (
          <View className="mx-4 mt-4 bg-red-50 p-4 rounded-2xl border border-red-200">
            <Text className={`text-red-900 font-bold text-base mb-2 ${isRTL ? 'text-right' : ''}`}>
              ⚠️ {t('errorLoadingRankings')}
            </Text>
            <Text className={`text-red-700 text-sm mb-3 ${isRTL ? 'text-right' : ''}`}>{error}</Text>
            <TouchableOpacity
              onPress={loadRankings}
              style={styles.retryButton}
            >
              <Text className="text-white text-center font-semibold">
                {t('retry')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {topRankers.length === 0 ? (
          <View className="p-8 items-center mt-8">
            <View className="w-32 h-32 bg-gray-100 rounded-full items-center justify-center mb-6">
              <Text className="text-6xl">🏆</Text>
            </View>
            <Text className="text-gray-900 font-bold text-xl mb-2">
              {t('noRankingsYet')}
            </Text>
            <Text className="text-gray-500 text-center text-base">
              {t('claimTopSpot')}
            </Text>
          </View>
        ) : (
          <>
            {/* Top 3 Podium */}
            {renderTopThree()}

            {/* Current User Rank Display */}
            {currentUserRank && (
              <View className="mx-4 mb-4" style={styles.userRankCard}>
                <Text className={`text-white font-bold text-lg mb-3 ${isRTL ? 'text-right' : ''}`}>
                  Your Rank
                </Text>
                <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <View style={styles.userRankBadge}>
                      <Text className="text-white font-bold text-xl">
                        #{currentUserRank.rank}
                      </Text>
                    </View>
                    <View className={isRTL ? 'mr-4' : 'ml-4'}>
                      <Text className="text-white font-semibold text-base">
                        {currentUserRank.totalCorrectAnswers} {t('correctCount')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Rest of Rankings */}
            <View className="px-4 pb-6">
              <Text className={`text-gray-900 font-bold text-lg mb-3 ${isRTL ? 'text-right' : ''}`}>
                All Rankings
              </Text>
              <View style={styles.rankingsList}>
                {topRankers.map((ranker, index) => {
                  const colors = getRankBadgeColors(ranker.rank);
                  const isTopThree = ranker.rank <= 3;
                  const isCurrentUser = user?.id === ranker.userId;

                  return (
                    <View
                      key={ranker.userId}
                      className={`flex-row items-center p-4 ${
                        index < topRankers.length - 1 ? 'border-b border-gray-100' : ''
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                      style={isCurrentUser ? styles.currentUserRow : undefined}
                    >
                      {/* Rank Badge */}
                      <View 
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ 
                          backgroundColor: colors.gradient[0],
                          borderWidth: isTopThree ? 2 : 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text className="font-bold text-sm" style={{ color: colors.text }}>
                          {ranker.rank}
                        </Text>
                      </View>

                      {/* Profile Picture */}
                      <View className={isRTL ? 'mr-0 ml-3' : 'mr-3 ml-0'}>
                        {getProfileImage(ranker) ? (
                          <Image
                            source={{ uri: getProfileImage(ranker)! }}
                            className="w-12 h-12 rounded-full"
                            style={styles.profileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.profileAvatar}>
                            <Text className="text-white font-bold text-base">
                              {getInitials(ranker.userName)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* User Info */}
                      <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-0'}`}>
                        <Text
                          className={`font-semibold text-base text-gray-900 ${isRTL ? 'text-right' : ''}`}
                          numberOfLines={1}
                        >
                          {ranker.userName || (isRTL ? 'مجهول' : 'Anonymous')}
                          {isCurrentUser && ' (You)'}
                        </Text>
                        <Text className={`text-gray-500 text-xs mt-1 ${isRTL ? 'text-right' : ''}`}>
                          Correct answers
                        </Text>
                      </View>

                      {/* Score */}
                      <View className={`bg-indigo-50 px-4 py-2 rounded-xl ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        <Text className="text-indigo-700 font-bold text-xl text-center">
                          {ranker.totalCorrectAnswers}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rankBadge2: {
    position: 'absolute',
    top: -12,
    right: -8,
    zIndex: 10,
    backgroundColor: '#9CA3AF',
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rankBadge3: {
    position: 'absolute',
    top: -12,
    right: -8,
    zIndex: 10,
    backgroundColor: '#8B4513',
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  crownBadge: {
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -16,
    zIndex: 10,
    backgroundColor: '#FBBF24',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  secondPlaceImage: {
    borderWidth: 3,
    borderColor: '#C0C0C0',
  },
  secondPlaceAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C0C0C0',
  },
  firstPlaceImageContainer: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  firstPlaceImage: {
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  firstPlaceAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  firstPlaceScoreBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  thirdPlaceImage: {
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  thirdPlaceAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  thirdPlaceScoreBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  userRankCard: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userRankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rankingsList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImage: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currentUserRow: {
    backgroundColor: '#EEF2FF',
  },
});
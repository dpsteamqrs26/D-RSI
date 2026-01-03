// app/courses.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { getBaseUrl } from '@/lib/api';

interface Course {
  id: number;
  title: string;
  description: string | null;
  levelRequirement: string;
  pointsAwarded: number;
  imageUrl: string | null;
  order: number;
}

interface Lesson {
  id: number;
  courseId: number;
  title: string;
  content: string;
  order: number;
  xpReward: number;
}

interface UserProgress {
  courseId: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
}

interface UserData {
  id: number;
  clerkId: string;
  xp: number;
  currentLevel: string;
}

// Level colors
const LEVEL_COLORS = {
  RED: { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', label: 'Beginner' },
  YELLOW: { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', label: 'Intermediate' },
  GREEN: { bg: '#D1FAE5', border: '#10B981', text: '#059669', label: 'Advanced' },
};

export default function CoursesScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'achyutkpaliwal@gmail.com' ||
    user?.primaryEmailAddress?.emailAddress === 'dpsteamqrs26@gmail.com' ||
    user?.primaryEmailAddress?.emailAddress === 'hishaam259@gmail.com';

  const loadCourses = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/courses?clerkId=${user?.id || ''}`;
      console.log('Fetching courses from:', url);
      
      const response = await fetch(url, { 
        headers: { 'Accept': 'application/json' } 
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON response. Raw body:', responseText.substring(0, 1000));
        throw new Error('Server returned invalid data format (HTML instead of JSON). Check console for details.');
      }
      
      if (!response.ok) {
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      setCourses(data.courses || []);
      setUserProgress(data.userProgress || []);
      setUserData(data.user);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const openCourse = async (course: Course) => {
    try {
      setLessonLoading(true);
      const baseUrl = getBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/courses?courseId=${course.id}&clerkId=${user?.id || ''}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to load course');

      const data = await response.json();
      setSelectedCourse(course);
      setCourseLessons(data.lessons || []);
      setCompletedLessonIds(data.completedLessonIds || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load course');
    } finally {
      setLessonLoading(false);
    }
  };

  const completeLesson = async () => {
    if (!selectedLesson || !selectedCourse || !user) return;

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'complete-lesson',
          clerkId: user.id,
          lessonId: selectedLesson.id,
          courseId: selectedCourse.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCompletedLessonIds(prev => [...prev, selectedLesson.id]);
        if (data.xpEarned) {
          Alert.alert('🎉 Lesson Complete!', `You earned ${data.xpEarned} XP!\nTotal XP: ${data.totalXp}`);
        }
        setSelectedLesson(null);
        loadCourses(); // Refresh progress
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete lesson');
    }
  };

  const getProgressForCourse = (courseId: number) => {
    return userProgress.find(p => p.courseId === courseId);
  };

  const getLevelColor = (level: string) => {
    return LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS.RED;
  };

  const currentLevel = userData?.currentLevel || 'RED';
  const levelColor = getLevelColor(currentLevel);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Level Badge */}
      <View className="bg-white border-b border-gray-200 pt-12 pb-4 px-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Courses</Text>
            <Text className="text-sm text-gray-500">Learn road safety step by step</Text>
          </View>
          
          {/* Level Badge */}
          <View 
            className="px-4 py-2 rounded-full flex-row items-center"
            style={{ backgroundColor: levelColor.bg, borderWidth: 2, borderColor: levelColor.border }}
          >
            <View 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: levelColor.border }}
            />
            <View>
              <Text className="text-xs font-bold" style={{ color: levelColor.text }}>
                {levelColor.label}
              </Text>
              <Text className="text-xs" style={{ color: levelColor.text }}>
                {userData?.xp || 0} XP
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar for Next Level */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-gray-500">Progress to next level</Text>
            <Text className="text-xs text-gray-500">
              {currentLevel === 'RED' ? `${userData?.xp || 0}/500 XP` :
               currentLevel === 'YELLOW' ? `${userData?.xp || 0}/1500 XP` : 'Max Level!'}
            </Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View 
              className="h-full rounded-full"
              style={{ 
                backgroundColor: levelColor.border,
                width: currentLevel === 'GREEN' ? '100%' : 
                  `${currentLevel === 'RED' ? 
                    ((userData?.xp || 0) / 500) * 100 : 
                    ((userData?.xp || 0) / 1500) * 100}%`
              }}
            />
          </View>
        </View>

        {/* Admin Create Button */}
        {isAdmin && (
          <TouchableOpacity
            className="mt-4 bg-blue-600 py-3 rounded-xl items-center"
            onPress={() => router.push('/create-course' as any)}
          >
            <Text className="text-white font-bold">+ Create New Course</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Courses List - Duolingo Style */}
      <ScrollView 
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {courses.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16">
            <Text className="text-xl font-bold text-gray-600 mb-2">No Courses Yet</Text>
            <Text className="text-gray-400 text-center">
              {isAdmin ? 'Create your first course to get started!' : 'Check back soon for new courses.'}
            </Text>
          </View>
        ) : (
          <View className="items-center">
            {courses.map((course, index) => {
              const progress = getProgressForCourse(course.id);
              const courseLevel = getLevelColor(course.levelRequirement);
              const progressPercent = progress 
                ? Math.round((progress.completedLessons / Math.max(progress.totalLessons, 1)) * 100)
                : 0;
              const isCompleted = progress?.isCompleted || false;

              return (
                <View key={course.id} className="items-center w-full">
                  {/* Connector Line */}
                  {index > 0 && (
                    <View className="w-1 h-6 bg-gray-300 rounded-full" />
                  )}
                  
                  {/* Course Node */}
                  <TouchableOpacity
                    onPress={() => openCourse(course)}
                    className="w-full max-w-sm"
                  >
                    <View 
                      className={`p-5 rounded-2xl border-2 ${isCompleted ? 'bg-green-50' : 'bg-white'}`}
                      style={{ borderColor: isCompleted ? '#10B981' : courseLevel.border }}
                    >
                      {/* Course Header */}
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-3">
                          <Text className="text-lg font-bold text-gray-900">{course.title}</Text>
                          {course.description && (
                            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                              {course.description}
                            </Text>
                          )}
                        </View>
                        
                        {/* Level Badge */}
                        <View 
                          className="px-2 py-1 rounded-full"
                          style={{ backgroundColor: courseLevel.bg }}
                        >
                          <Text className="text-xs font-bold" style={{ color: courseLevel.text }}>
                            {courseLevel.label}
                          </Text>
                        </View>
                      </View>

                      {/* Progress & XP */}
                      <View className="flex-row justify-between items-center mt-3">
                        <View className="flex-1 mr-3">
                          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <View 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </View>
                          <Text className="text-xs text-gray-500 mt-1">
                            {progress ? `${progress.completedLessons}/${progress.totalLessons} lessons` : 'Not started'}
                          </Text>
                        </View>
                        
                        <View className="bg-yellow-100 px-2 py-1 rounded-lg">
                          <Text className="text-xs font-bold text-yellow-700">
                            +{course.pointsAwarded} XP
                          </Text>
                        </View>
                      </View>

                      {/* Completion Check */}
                      {isCompleted && (
                        <View className="absolute top-3 right-3 bg-green-500 w-6 h-6 rounded-full items-center justify-center">
                          <Text className="text-white text-sm">✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Course Detail Modal */}
      <Modal visible={!!selectedCourse && !selectedLesson} animationType="slide">
        <View className="flex-1 bg-white">
          <View 
            className="pt-12 pb-4 px-4"
            style={{ backgroundColor: getLevelColor(selectedCourse?.levelRequirement || 'RED').bg }}
          >
            <TouchableOpacity onPress={() => setSelectedCourse(null)} className="mb-4">
              <Text className="text-blue-600 font-bold text-lg">← Back</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">{selectedCourse?.title}</Text>
            {selectedCourse?.description && (
              <Text className="text-gray-600 mt-2">{selectedCourse.description}</Text>
            )}
          </View>

          <ScrollView className="flex-1 p-4">
            {lessonLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" className="mt-8" />
            ) : courseLessons.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-500">No lessons in this course yet.</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {courseLessons.map((lesson, index) => {
                  const isLessonCompleted = completedLessonIds.includes(lesson.id);
                  
                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      onPress={() => setSelectedLesson(lesson)}
                      className={`p-4 rounded-xl border-2 flex-row items-center ${
                        isLessonCompleted ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Lesson Number Circle */}
                      <View 
                        className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                          isLessonCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      >
                        {isLessonCompleted ? (
                          <Text className="text-white font-bold">✓</Text>
                        ) : (
                          <Text className="text-white font-bold">{index + 1}</Text>
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className={`text-base font-semibold ${
                          isLessonCompleted ? 'text-green-800' : 'text-gray-900'
                        }`}>
                          {lesson.title}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          +{lesson.xpReward} XP
                        </Text>
                      </View>

                      <Text className="text-blue-500 font-bold">→</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Lesson Content Modal */}
      <Modal visible={!!selectedLesson} animationType="fade">
        <View className="flex-1 bg-white">
          <View className="bg-blue-600 pt-12 pb-4 px-4">
            <TouchableOpacity onPress={() => setSelectedLesson(null)} className="mb-4">
              <Text className="text-white font-bold text-lg">← Back to Course</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white">{selectedLesson?.title}</Text>
            <View className="flex-row items-center mt-2">
              <View className="bg-yellow-400 px-2 py-1 rounded-lg">
                <Text className="text-xs font-bold text-yellow-900">
                  +{selectedLesson?.xpReward} XP
                </Text>
              </View>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            <Text className="text-base text-gray-800 leading-7">
              {selectedLesson?.content}
            </Text>
          </ScrollView>

          {/* Complete Button */}
          {selectedLesson && !completedLessonIds.includes(selectedLesson.id) && (
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={completeLesson}
                className="bg-green-500 py-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-lg">Complete Lesson ✓</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedLesson && completedLessonIds.includes(selectedLesson.id) && (
            <View className="p-4 bg-green-50">
              <Text className="text-center text-green-700 font-bold">
                ✓ Lesson Completed!
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

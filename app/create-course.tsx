// app/create-course.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { getBaseUrl } from '@/lib/api';

interface Lesson {
  id: string;
  title: string;
  content: string;
  xpReward: number;
}

export default function CreateCourseScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [levelRequirement, setLevelRequirement] = useState<'RED' | 'YELLOW' | 'GREEN'>('RED');
  const [pointsAwarded, setPointsAwarded] = useState('50');
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'achyutkpaliwal@gmail.com' ||
    user?.primaryEmailAddress?.emailAddress === 'dpsteamqrs26@gmail.com' ||
    user?.primaryEmailAddress?.emailAddress === 'hishaam259@gmail.com';

  if (!isAdmin) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-gray-100">
        <Text className="text-2xl font-bold text-red-500 mb-2">Access Denied</Text>
        <Text className="text-base text-gray-600 mb-6">Only admins can create courses</Text>
        <TouchableOpacity
          className="bg-blue-500 py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold text-base">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addLesson = () => {
    const newLesson: Lesson = {
      id: `lesson_${Date.now()}`,
      title: '',
      content: '',
      xpReward: 25,
    };
    setLessons([...lessons, newLesson]);
  };

  const removeLesson = (lessonId: string) => {
    setLessons(lessons.filter(l => l.id !== lessonId));
  };

  const updateLesson = (lessonId: string, field: keyof Lesson, value: string | number) => {
    setLessons(lessons.map(l => 
      l.id === lessonId ? { ...l, [field]: value } : l
    ));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a course title');
      return false;
    }
    if (lessons.length === 0) {
      Alert.alert('Error', 'Please add at least one lesson');
      return false;
    }
    for (let i = 0; i < lessons.length; i++) {
      if (!lessons[i].title.trim()) {
        Alert.alert('Error', `Lesson ${i + 1} needs a title`);
        return false;
      }
      if (!lessons[i].content.trim()) {
        Alert.alert('Error', `Lesson ${i + 1} needs content`);
        return false;
      }
    }
    return true;
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const baseUrl = getBaseUrl();
      
      // First create the course
      const courseResponse = await fetch(`${baseUrl}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-course',
          userEmail: user?.primaryEmailAddress?.emailAddress,
          title: title.trim(),
          description: description.trim(),
          levelRequirement,
          pointsAwarded: parseInt(pointsAwarded) || 50,
        }),
      });

      const courseData = await courseResponse.json();
      if (!courseData.success) {
        throw new Error(courseData.error || 'Failed to create course');
      }

      const courseId = courseData.course.id;

      // Then add all lessons
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        await fetch(`${baseUrl}/api/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'add-lesson',
            userEmail: user?.primaryEmailAddress?.emailAddress,
            courseId,
            title: lesson.title.trim(),
            content: lesson.content.trim(),
            xpReward: lesson.xpReward,
            order: i,
          }),
        });
      }

      Alert.alert('Success', 'Course created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating course:', error);
      Alert.alert('Error', `Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const levelOptions = [
    { value: 'RED', label: 'Beginner', color: '#EF4444' },
    { value: 'YELLOW', label: 'Intermediate', color: '#F59E0B' },
    { value: 'GREEN', label: 'Advanced', color: '#10B981' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200 shadow-sm pt-12">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-500 text-lg font-medium">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Create Course</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Course Title */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Course Title *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter course title"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Description</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white h-20"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter course description (optional)"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Level Requirement */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-3">Required Level</Text>
          <View className="flex-row gap-2">
            {levelOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setLevelRequirement(option.value as any)}
                className={`flex-1 p-3 rounded-xl border-2 items-center ${
                  levelRequirement === option.value ? 'border-blue-500' : 'border-gray-200'
                }`}
                style={levelRequirement === option.value ? { backgroundColor: option.color + '20' } : {}}
              >
                <View 
                  className="w-4 h-4 rounded-full mb-1"
                  style={{ backgroundColor: option.color }}
                />
                <Text className={`text-xs font-semibold ${
                  levelRequirement === option.value ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* XP Reward */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Course XP Reward</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white"
            value={pointsAwarded}
            onChangeText={setPointsAwarded}
            placeholder="50"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        {/* Lessons */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">Lessons</Text>
            <TouchableOpacity
              className="bg-green-500 py-2 px-4 rounded-lg shadow-sm"
              onPress={addLesson}
            >
              <Text className="text-white font-bold text-sm">+ Add Lesson</Text>
            </TouchableOpacity>
          </View>

          {lessons.length === 0 && (
            <Text className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-300">
              No lessons yet. Click "Add Lesson" to start.
            </Text>
          )}

          {lessons.map((lesson, index) => (
            <View key={lesson.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-blue-600">Lesson {index + 1}</Text>
                <TouchableOpacity onPress={() => removeLesson(lesson.id)}>
                  <Text className="text-red-500 font-semibold text-sm">Remove</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-600 mb-2">Title *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base bg-white mb-3"
                value={lesson.title}
                onChangeText={text => updateLesson(lesson.id, 'title', text)}
                placeholder="Enter lesson title"
                placeholderTextColor="#999"
              />

              <Text className="text-sm font-semibold text-gray-600 mb-2">Content *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base bg-white h-32 mb-3"
                value={lesson.content}
                onChangeText={text => updateLesson(lesson.id, 'content', text)}
                placeholder="Enter lesson content..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />

              <Text className="text-sm font-semibold text-gray-600 mb-2">XP Reward</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base bg-white w-24"
                value={String(lesson.xpReward)}
                onChangeText={text => updateLesson(lesson.id, 'xpReward', parseInt(text) || 0)}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          ))}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          className={`bg-blue-600 p-4 rounded-xl shadow-md items-center mb-10 ${loading ? 'opacity-70' : ''}`}
          onPress={handleCreateCourse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Create Course</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

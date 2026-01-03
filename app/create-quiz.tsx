// app/create-quiz.tsx
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
import { useQuizDraft } from '@/context/QuizContext';

export default function CreateQuizScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Use context for quiz draft state (persists across navigation)
  const {
    quizDraft,
    setTitle,
    setDescription,
    setDurationMinutes,
    addQuestion,
    removeQuestion,
    updateQuestionText,
    updateOptionText,
    setCorrectOption,
    clearDraft,
  } = useQuizDraft();
  
  const { title, description, durationMinutes, questions } = quizDraft;

  // Check if user is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === 'achyutkpaliwal@gmail.com' || user?.primaryEmailAddress?.emailAddress === 'dpsteamqrs26@gmail.com' || user?.primaryEmailAddress?.emailAddress === 'hishaam259@gmail.com';

  if (!isAdmin) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-gray-100">
        <Text className="text-2xl font-bold text-red-500 mb-2">Access Denied</Text>
        <Text className="text-base text-gray-600 mb-6">Only admins can create quizzes</Text>
        <TouchableOpacity
          className="bg-blue-500 py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold text-base">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const validateQuiz = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a quiz title');
      return false;
    }

    const duration = parseInt(durationMinutes);
    if (!duration || duration <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return false;
    }

    if (questions.length === 0) {
      Alert.alert('Error', 'Please add at least one question');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.questionText.trim()) {
        Alert.alert('Error', `Question ${i + 1} is empty`);
        return false;
      }

      const emptyOptions = q.options.filter(opt => !opt.text.trim());
      if (emptyOptions.length > 0) {
        Alert.alert('Error', `Question ${i + 1} has empty options`);
        return false;
      }

      if (!q.correctOptionId) {
        Alert.alert('Error', `Question ${i + 1} has no correct answer selected`);
        return false;
      }
    }

    return true;
  };

  const handleCreateQuiz = async () => {
    if (!validateQuiz()) return;

    setLoading(true);

    try {
      const baseUrl = getBaseUrl();
      console.log('Creating quiz at:', `${baseUrl}/api/quizzes`);
      
      const response = await fetch(`${baseUrl}/api/quizzes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          type: 'create-quiz',
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userId: user?.id,
          title: title.trim(),
          description: description.trim(),
          durationMinutes: parseInt(durationMinutes),
          questions: questions.map(q => ({
            questionText: q.questionText.trim(),
            options: q.options.map(opt => ({
              id: opt.id,
              text: opt.text.trim(),
            })),
            correctOptionId: q.correctOptionId,
          })),
        }),
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);

      if (data.success) {
        clearDraft(); // Clear the saved draft on success
        Alert.alert('Success', 'Quiz created successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', `Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-500 text-lg font-medium">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Create Quiz</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Quiz Title *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter quiz title"
            placeholderTextColor="#999"
          />
        </View>

        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Description</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white h-20"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter quiz description (optional)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-bold text-gray-800 mb-2">Duration (minutes) *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-base bg-white"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="e.g., 10"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">Questions</Text>
            <TouchableOpacity 
              className="bg-green-500 py-2 px-4 rounded-lg shadow-sm"
              onPress={addQuestion}
            >
              <Text className="text-white font-bold text-sm">+ Add Question</Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 && (
            <Text className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-300">
              No questions yet. Click "Add Question" to start.
            </Text>
          )}

          {questions.map((question, qIndex) => (
            <View key={question.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-blue-600">Question {qIndex + 1}</Text>
                <TouchableOpacity onPress={() => removeQuestion(question.id)}>
                  <Text className="text-red-500 font-semibold text-sm">Remove</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                className="border border-gray-300 rounded-lg p-3 text-base bg-white mb-4 h-16"
                value={question.questionText}
                onChangeText={text => updateQuestionText(question.id, text)}
                placeholder="Enter question text"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />

              <Text className="text-sm font-semibold text-gray-600 mb-3">Options (Select the correct one)</Text>
              {question.options.map((option, oIndex) => (
                <View key={option.id} className="flex-row items-center mb-3">
                  <TouchableOpacity
                    className={`w-6 h-6 rounded-full border-2 mr-3 justify-center items-center ${
                      question.correctOptionId === option.id ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    onPress={() => setCorrectOption(question.id, option.id)}
                  >
                    {question.correctOptionId === option.id && (
                      <View className="w-3 h-3 rounded-full bg-blue-500" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    className="flex-1 border border-gray-200 rounded-lg p-3 text-sm bg-white"
                    value={option.text}
                    onChangeText={text => updateOptionText(question.id, option.id, text)}
                    placeholder={`Option ${oIndex + 1}`}
                    placeholderTextColor="#999"
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          className={`bg-blue-600 p-4 rounded-xl shadow-md items-center mb-10 ${loading ? 'opacity-70' : ''}`}
          onPress={handleCreateQuiz}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">Create Quiz</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

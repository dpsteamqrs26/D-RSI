// context/QuizContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types for Quiz Creation
interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  questionText: string;
  options: Option[];
  correctOptionId: string;
}

interface QuizDraft {
  title: string;
  description: string;
  durationMinutes: string;
  questions: Question[];
}

interface QuizContextType {
  // Quiz draft state
  quizDraft: QuizDraft;
  
  // Setters
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setDurationMinutes: (duration: string) => void;
  setQuestions: (questions: Question[]) => void;
  
  // Actions
  addQuestion: () => void;
  removeQuestion: (questionId: string) => void;
  updateQuestionText: (questionId: string, text: string) => void;
  updateOptionText: (questionId: string, optionId: string, text: string) => void;
  setCorrectOption: (questionId: string, optionId: string) => void;
  clearDraft: () => void;
  hasDraft: () => boolean;
}

const defaultDraft: QuizDraft = {
  title: '',
  description: '',
  durationMinutes: '',
  questions: [],
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizDraft, setQuizDraft] = useState<QuizDraft>(defaultDraft);

  const setTitle = (title: string) => {
    setQuizDraft(prev => ({ ...prev, title }));
  };

  const setDescription = (description: string) => {
    setQuizDraft(prev => ({ ...prev, description }));
  };

  const setDurationMinutes = (durationMinutes: string) => {
    setQuizDraft(prev => ({ ...prev, durationMinutes }));
  };

  const setQuestions = (questions: Question[]) => {
    setQuizDraft(prev => ({ ...prev, questions }));
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      questionText: '',
      options: [
        { id: `opt_1_${Date.now()}`, text: '' },
        { id: `opt_2_${Date.now()}`, text: '' },
        { id: `opt_3_${Date.now()}`, text: '' },
        { id: `opt_4_${Date.now()}`, text: '' },
      ],
      correctOptionId: '',
    };
    setQuizDraft(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const removeQuestion = (questionId: string) => {
    setQuizDraft(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId),
    }));
  };

  const updateQuestionText = (questionId: string, text: string) => {
    setQuizDraft(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, questionText: text } : q
      ),
    }));
  };

  const updateOptionText = (questionId: string, optionId: string, text: string) => {
    setQuizDraft(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map(opt =>
                opt.id === optionId ? { ...opt, text } : opt
              ),
            }
          : q
      ),
    }));
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuizDraft(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, correctOptionId: optionId } : q
      ),
    }));
  };

  const clearDraft = () => {
    setQuizDraft(defaultDraft);
  };

  const hasDraft = () => {
    return (
      quizDraft.title.trim() !== '' ||
      quizDraft.description.trim() !== '' ||
      quizDraft.durationMinutes.trim() !== '' ||
      quizDraft.questions.length > 0
    );
  };

  return (
    <QuizContext.Provider
      value={{
        quizDraft,
        setTitle,
        setDescription,
        setDurationMinutes,
        setQuestions,
        addQuestion,
        removeQuestion,
        updateQuestionText,
        updateOptionText,
        setCorrectOption,
        clearDraft,
        hasDraft,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuizDraft() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuizDraft must be used within a QuizProvider');
  }
  return context;
}

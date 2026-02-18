import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { learningApi, authApi } from '../services/api';
import { Upload, BookOpen, TrendingUp, AlertTriangle, FileText, Printer, ChevronDown, ChevronUp, Check, X, ClipboardList, Send } from 'lucide-react';

export default function Learning() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'proficiency' | 'worksheet' | 'my-worksheets' | 'assigned'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const { data: homework } = useQuery({
    queryKey: ['homework', selectedUser],
    queryFn: () => learningApi.getHomeworkHistory(selectedUser!),
    enabled: !!selectedUser && activeTab === 'history',
  });

  const { data: proficiency } = useQuery({
    queryKey: ['proficiency', selectedUser],
    queryFn: () => learningApi.getProficiency(selectedUser!),
    enabled: !!selectedUser && activeTab === 'proficiency',
  });

  const { data: weakAreas } = useQuery({
    queryKey: ['weak-areas', selectedUser],
    queryFn: () => learningApi.getWeakAreas(selectedUser!),
    enabled: !!selectedUser && activeTab === 'proficiency',
  });

  const uploadMutation = useMutation({
    mutationFn: learningApi.uploadHomework,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['proficiency'] });
      setUploadResult(data);
    },
  });

  const worksheetMutation = useMutation({
    mutationFn: learningApi.generateWorksheet,
  });

  const assignMutation = useMutation({
    mutationFn: ({ worksheetId, assignedTo }: { worksheetId: number; assignedTo: number }) =>
      learningApi.assignWorksheet(worksheetId, assignedTo),
    onSuccess: () => {
      setShowAssignModal(false);
      queryClient.invalidateQueries({ queryKey: ['assigned-worksheets'] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ worksheetId, formData }: { worksheetId: number; formData: FormData }) =>
      learningApi.submitWorksheet(worksheetId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-worksheets'] });
      setSelectedWorksheetForSubmit(null);
    },
  });

  // Get assigned worksheets for kids
  const { data: assignedWorksheets } = useQuery({
    queryKey: ['assigned-worksheets', user?.id],
    queryFn: () => learningApi.getAssignedWorksheets(user?.id || 0),
    enabled: !!user && user.role === 'child' && activeTab === 'my-worksheets',
  });

  const [uploadResult, setUploadResult] = useState<any>(null);
  const [worksheetResult, setWorksheetResult] = useState<any>(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignToKid, setAssignToKid] = useState<number | null>(null);
  const submitFileRef = useRef<HTMLInputElement>(null);
  const [selectedWorksheetForSubmit, setSelectedWorksheetForSubmit] = useState<number | null>(null);
  const [assignedFilterUserId, setAssignedFilterUserId] = useState<number | null>(null);

  // Note: assignedFilterUserId defaults to null which means "All Kids"

  // Get children IDs for "All Kids" query
  const childrenIds = family?.filter((m: any) => m.role === 'child').map((c: any) => c.id) || [];

  // Get all assigned worksheets for parents (filtered by selected child or all children)
  const { data: allAssignedWorksheets } = useQuery({
    queryKey: ['all-assigned-worksheets', assignedFilterUserId, childrenIds],
    queryFn: async () => {
      if (assignedFilterUserId) {
        // Fetch for specific child
        return learningApi.getAssignedWorksheets(assignedFilterUserId);
      } else {
        // Fetch for all children and combine
        const results = await Promise.all(
          childrenIds.map((id: number) => learningApi.getAssignedWorksheets(id))
        );
        return results.flat();
      }
    },
    enabled: user?.role === 'parent' && activeTab === 'assigned' && (!!assignedFilterUserId || childrenIds.length > 0),
  });

  const selectedChild = family?.find((m: any) => m.id === selectedUser);

  // Get grade level category for topic suggestions
  const getGradeCategory = (grade: string | null) => {
    if (!grade) return 'elementary';
    const g = grade.toLowerCase();
    if (g.includes('toddler') || g.includes('pre-k') || g.includes('preschool') || g.includes('kindergarten')) return 'toddler';
    if (g.includes('1st') || g.includes('2nd') || g.includes('3rd')) return 'early';
    if (g.includes('4th') || g.includes('5th') || g.includes('6th')) return 'middle';
    if (g.includes('7th') || g.includes('8th')) return 'junior';
    return 'elementary';
  };

  const gradeCategory = getGradeCategory(selectedChild?.grade);

  // Topic suggestions by subject and grade level
  const topicsByGrade: Record<string, Record<string, string[]>> = {
    toddler: {
      Math: ['Counting 1-10', 'Shapes', 'Colors', 'Big and Small', 'More and Less', 'Sorting'],
      Science: ['Animals', 'Body Parts', 'Weather', 'Plants', 'Seasons', 'Five Senses'],
      Reading: ['ABCs', 'Rhyming Words', 'Picture Stories', 'Letter Sounds', 'Sight Words'],
      'Arabic/Quran': ['Arabic Letters', 'Allah Names', 'Simple Duas', 'Islamic Greetings'],
    },
    early: {
      Math: ['Addition', 'Subtraction', 'Skip Counting', 'Place Value', 'Telling Time', 'Money', 'Simple Fractions', 'Multiplication Tables'],
      Science: ['Living vs Non-Living', 'Life Cycles', 'Habitats', 'Water Cycle', 'Magnets', 'Sound', 'Light'],
      Reading: ['Reading Comprehension', 'Sight Words', 'Story Sequence', 'Main Idea', 'Characters and Setting', 'Vocabulary'],
      'Arabic/Quran': ['Arabic Alphabet', 'Short Surahs', 'Prophet Stories', 'Five Pillars', 'Basic Duas', 'Islamic Manners'],
    },
    middle: {
      Math: ['Fractions and Decimals', 'Ratios and Proportions', 'Percentages', 'Integers', 'Order of Operations', 'Area and Perimeter', 'Volume', 'Mean Median Mode', 'Algebraic Expressions'],
      Science: ['Cells', 'Earth Layers', 'Weather and Climate', 'Energy', 'Simple Machines', 'Food Chains', 'Solar System', 'States of Matter'],
      Reading: ['Reading Comprehension', 'Main Idea and Details', 'Cause and Effect', 'Compare and Contrast', 'Context Clues', 'Figurative Language', 'Making Inferences'],
      'Arabic/Quran': ['Arabic Vocabulary', 'Quran Vocabulary', 'Tafseer Basics', 'Seerah', 'Islamic History', 'Fiqh Basics'],
    },
    junior: {
      Math: ['Pre-Algebra', 'Linear Equations', 'Geometry Proofs', 'Pythagorean Theorem', 'Statistics', 'Probability', 'Functions'],
      Science: ['Chemistry Basics', 'Physics Concepts', 'Biology', 'Genetics', 'Ecosystems', 'Chemical Reactions'],
      Reading: ['Literary Analysis', 'Theme and Symbolism', 'Argument Analysis', 'Research Skills', 'Essay Writing'],
      'Arabic/Quran': ['Advanced Arabic', 'Quran Memorization', 'Hadith Studies', 'Islamic Jurisprudence'],
    },
  };

  const topicSuggestions = topicsByGrade[gradeCategory] || topicsByGrade.middle;

  const handleFileUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', String(selectedUser));
    formData.append('title', file.name);
    uploadMutation.mutate(formData);
  };

  const handleGenerateWorksheet = (subject: string, topic: string) => {
    worksheetMutation.mutate(
      {
        user_id: selectedUser,
        subject,
        topic_name: topic,
        difficulty: 'medium',
        question_count: 10,
      },
      {
        onSuccess: (data) => setWorksheetResult(data),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Learning Center</h1>
        {user?.role === 'parent' && family && (
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {family
              .filter((m: any) => m.role === 'child')
              .map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { id: 'upload', label: 'Upload Homework', icon: Upload, roles: ['parent', 'child'] },
          { id: 'my-worksheets', label: 'My Worksheets', icon: ClipboardList, roles: ['child'] },
          { id: 'history', label: 'History', icon: FileText, roles: ['parent', 'child'] },
          { id: 'proficiency', label: 'Progress', icon: TrendingUp, roles: ['parent', 'child'] },
          { id: 'worksheet', label: 'Generate', icon: Printer, roles: ['parent'] },
          { id: 'assigned', label: 'Assigned', icon: Send, roles: ['parent'] },
        ].filter(tab => tab.roles.includes(user?.role || 'parent')).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-islamic-green text-islamic-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-islamic-green transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium">Upload Homework Image</p>
            <p className="text-sm text-gray-500 mt-1">
              Click or drag an image of homework to analyze
            </p>
          </div>

          {uploadMutation.isPending && (
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-blue-700">Analyzing homework with AI...</p>
            </div>
          )}

          {uploadResult && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4">Analysis Results</h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{uploadResult.questions_found}</p>
                  <p className="text-sm text-gray-500">Questions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {uploadResult.correct_answers}
                  </p>
                  <p className="text-sm text-gray-500">Correct</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {uploadResult.score?.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500">Score</p>
                </div>
              </div>

              {uploadResult.feedback && (
                <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                  <p className="font-medium">Feedback:</p>
                  <p className="text-sm">{uploadResult.feedback}</p>
                </div>
              )}

              {uploadResult.weak_areas?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="font-medium flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    Areas to Improve:
                  </p>
                  <ul className="list-disc list-inside text-sm mt-2">
                    {uploadResult.weak_areas.map((area: string, i: number) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Toggle for detailed results */}
              {uploadResult.questions?.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowDetailedResults(!showDetailedResults)}
                    className="flex items-center gap-2 text-islamic-green hover:text-teal-700 font-medium"
                  >
                    {showDetailedResults ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    {showDetailedResults ? 'Hide' : 'Show'} Detailed Results
                  </button>

                  {showDetailedResults && (
                    <div className="mt-4 space-y-3">
                      {uploadResult.questions.map((q: any, i: number) => (
                        <div
                          key={i}
                          className={`p-4 rounded-lg border ${
                            q.is_correct
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-1 rounded-full ${
                                q.is_correct ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            >
                              {q.is_correct ? (
                                <Check size={14} className="text-white" />
                              ) : (
                                <X size={14} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">
                                Q{q.question_number}: {q.question_text}
                              </p>
                              <div className="mt-2 text-sm space-y-1">
                                <p>
                                  <span className="text-gray-500">Student's Answer:</span>{' '}
                                  <span className={q.is_correct ? 'text-green-700' : 'text-red-700'}>
                                    {q.student_answer || 'Not answered'}
                                  </span>
                                </p>
                                {!q.is_correct && (
                                  <p>
                                    <span className="text-gray-500">Correct Answer:</span>{' '}
                                    <span className="text-green-700 font-medium">
                                      {q.correct_answer}
                                    </span>
                                  </p>
                                )}
                                {q.explanation && (
                                  <p className="text-gray-600 italic mt-1">
                                    {q.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {homework?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No homework uploaded yet.
            </div>
          ) : (
            homework?.map((hw: any) => (
              <div key={hw.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{hw.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(hw.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-islamic-green">
                      {hw.score?.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {hw.correct_answers}/{hw.questions_found} correct
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Proficiency Tab */}
      {activeTab === 'proficiency' && (
        <div className="space-y-6">
          {proficiency?.subjects?.map((subject: any) => (
            <div key={subject.subject} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{subject.subject}</h3>
                <span className="text-2xl font-bold text-islamic-green">
                  {subject.overall_score.toFixed(0)}%
                </span>
              </div>

              <div className="space-y-3">
                {subject.topics.map((topic: any) => (
                  <div key={topic.topic}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{topic.topic}</span>
                      <span className="font-medium">{topic.score.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          topic.score >= 80
                            ? 'bg-green-500'
                            : topic.score >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {subject.weak_areas.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700">
                    Needs improvement: {subject.weak_areas.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}

          {weakAreas?.weak_areas?.length > 0 && (
            <div className="bg-yellow-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Recommended Practice Areas</h3>
              <div className="space-y-2">
                {weakAreas.weak_areas.slice(0, 5).map((area: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-white rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{area.topic}</p>
                      <p className="text-sm text-gray-500">{area.subject}</p>
                    </div>
                    <button
                      onClick={() => handleGenerateWorksheet(area.subject, area.topic)}
                      className="px-3 py-1 bg-islamic-green text-white text-sm rounded-lg hover:bg-teal-700"
                    >
                      Practice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Worksheet Tab */}
      {activeTab === 'worksheet' && (
        <div className="space-y-6">
          {/* Student Info */}
          {selectedChild && (
            <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">Generating for: {selectedChild.name}</p>
                <p className="text-sm text-blue-600">
                  {selectedChild.grade || '6th Grade'} • {selectedChild.school || 'School'}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">Generate Practice Worksheet</h3>

            {/* Subject Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
              <div className="grid grid-cols-4 gap-2">
                {['Math', 'Science', 'Reading', 'Arabic/Quran'].map((subject) => (
                  <button
                    key={subject}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setSelectedTopic('');
                      setCustomTopic('');
                    }}
                    className={`p-3 border rounded-lg transition ${
                      selectedSubject === subject
                        ? 'border-islamic-green bg-islamic-light text-islamic-green'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <BookOpen size={20} className="mx-auto mb-1" />
                    <p className="text-sm font-medium">{subject}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Suggestions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Topic (or enter custom below)
              </label>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions[selectedSubject]?.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic('');
                    }}
                    className={`px-3 py-1.5 text-sm rounded-full border transition ${
                      selectedTopic === topic
                        ? 'bg-islamic-green text-white border-islamic-green'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Topic Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter custom topic
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value) setSelectedTopic('');
                }}
                placeholder="e.g., Multiplying fractions, Photosynthesis..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
              />
            </div>

            {/* Difficulty Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
              <div className="flex gap-2">
                {[
                  { value: 'easy', label: 'Easy', desc: 'Basic concepts' },
                  { value: 'medium', label: 'Medium', desc: 'Grade level' },
                  { value: 'hard', label: 'Hard', desc: 'Challenging' },
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setDifficulty(level.value)}
                    className={`flex-1 p-3 border rounded-lg transition ${
                      difficulty === level.value
                        ? 'border-islamic-green bg-islamic-light'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <p className="font-medium">{level.label}</p>
                    <p className="text-xs text-gray-500">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => {
                const topic = customTopic || selectedTopic || 'General Practice';
                worksheetMutation.mutate(
                  {
                    user_id: selectedUser,
                    subject: selectedSubject,
                    topic_name: topic,
                    difficulty: difficulty,
                    question_count: 10,
                    grade_level: selectedChild?.grade || '6th',
                  },
                  {
                    onSuccess: (data) => setWorksheetResult(data),
                  }
                );
              }}
              disabled={worksheetMutation.isPending}
              className="w-full py-3 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
            >
              {worksheetMutation.isPending ? 'Generating...' : `Generate ${selectedSubject} Worksheet`}
            </button>
          </div>

          {worksheetMutation.isPending && (
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-blue-700">Generating worksheet with AI...</p>
            </div>
          )}

          {worksheetResult && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{worksheetResult.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 px-3 py-1 bg-islamic-green text-white rounded-lg hover:bg-teal-700"
                  >
                    <Send size={16} />
                    Assign to Kid
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>

              <div className="space-y-4 print:space-y-6">
                {worksheetResult.questions?.map((q: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg print:bg-white print:border">
                    <p className="font-medium">
                      {q.question_number}. {q.question}
                    </p>
                    {q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt: string, j: number) => (
                          <p key={j} className="ml-4">
                            {opt}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 print:hidden">
                      <p className="text-sm text-gray-500">Answer: {q.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Worksheets Tab (for kids) */}
      {activeTab === 'my-worksheets' && (
        <div className="space-y-4">
          <input
            ref={submitFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && selectedWorksheetForSubmit) {
                const formData = new FormData();
                formData.append('file', file);
                submitMutation.mutate({ worksheetId: selectedWorksheetForSubmit, formData });
              }
            }}
          />

          {!assignedWorksheets?.length ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No worksheets assigned yet!</p>
              <p className="text-sm">Ask your parents to assign you some practice worksheets.</p>
            </div>
          ) : (
            assignedWorksheets.map((worksheet: any) => (
              <div
                key={worksheet.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  worksheet.status === 'graded'
                    ? 'border-green-500'
                    : worksheet.status === 'submitted'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{worksheet.title}</h3>
                    <p className="text-sm text-gray-500">
                      {worksheet.subject} • {worksheet.difficulty} • {worksheet.questions_count} questions
                    </p>
                    {worksheet.due_date && (
                      <p className="text-sm text-orange-600">
                        Due: {new Date(worksheet.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {worksheet.status === 'graded' ? (
                      <div>
                        <p className="text-2xl font-bold text-green-600">{worksheet.score?.toFixed(0)}%</p>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Graded
                        </span>
                      </div>
                    ) : worksheet.status === 'submitted' ? (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        Submitted - Grading...
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedWorksheetForSubmit(worksheet.id);
                            submitFileRef.current?.click();
                          }}
                          disabled={submitMutation.isPending}
                          className="flex items-center gap-1 px-3 py-2 bg-islamic-green text-white text-sm rounded-lg hover:bg-teal-700"
                        >
                          <Upload size={16} />
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assigned Tab (for parents to see assigned worksheets) */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Assigned Worksheets</h3>
            {family && (
              <select
                value={assignedFilterUserId || ''}
                onChange={(e) => setAssignedFilterUserId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Kids</option>
                {family
                  .filter((m: any) => m.role === 'child')
                  .map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {!allAssignedWorksheets?.length ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No worksheets assigned{assignedFilterUserId ? ` to ${family?.find((m: any) => m.id === assignedFilterUserId)?.name}` : ''} yet.</p>
              <p className="text-sm">Go to Generate tab to create and assign worksheets.</p>
            </div>
          ) : (
            allAssignedWorksheets.map((worksheet: any) => (
              <div
                key={worksheet.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  worksheet.status === 'graded'
                    ? 'border-green-500'
                    : worksheet.status === 'submitted'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{worksheet.title}</h3>
                    <p className="text-sm text-gray-500">
                      {worksheet.subject} • {worksheet.difficulty} • {worksheet.questions_count} questions
                    </p>
                    <p className="text-xs text-gray-400">
                      Assigned: {worksheet.assigned_at ? new Date(worksheet.assigned_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    {worksheet.status === 'graded' ? (
                      <div>
                        <p className="text-2xl font-bold text-green-600">{worksheet.score?.toFixed(0)}%</p>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Graded
                        </span>
                      </div>
                    ) : worksheet.status === 'submitted' ? (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        Submitted
                      </span>
                    ) : (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && worksheetResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Assign Worksheet</h3>
            <p className="text-sm text-gray-600 mb-4">{worksheetResult.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Child</label>
              <div className="space-y-2">
                {family
                  ?.filter((m: any) => m.role === 'child')
                  .map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => setAssignToKid(child.id)}
                      className={`w-full p-3 border rounded-lg text-left transition ${
                        assignToKid === child.id
                          ? 'border-islamic-green bg-islamic-light'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium">{child.name}</p>
                      <p className="text-sm text-gray-500">{child.grade}</p>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (assignToKid && worksheetResult.id) {
                    assignMutation.mutate({
                      worksheetId: worksheetResult.id,
                      assignedTo: assignToKid,
                    });
                  }
                }}
                disabled={!assignToKid || assignMutation.isPending}
                className="flex-1 px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

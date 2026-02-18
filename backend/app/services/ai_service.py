import json
import base64
from typing import Optional, Dict, Any, List
from openai import OpenAI
from app.config import settings


class AIService:
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = OpenAI(api_key=settings.openai_api_key)

    def _ensure_client(self):
        if not self.client:
            raise ValueError("OpenAI API key not configured. Please set OPENAI_API_KEY in .env")

    async def analyze_homework(self, image_base64: str, grade_level: str = "6th") -> Dict[str, Any]:
        """Analyze homework image and extract questions, answers, and grades."""
        self._ensure_client()

        prompt = f"""Analyze this homework image for a {grade_level} grade student.

Please provide a detailed analysis in the following JSON format:
{{
    "subject_detected": "Math/Science/Reading/Other",
    "total_questions": <number>,
    "questions": [
        {{
            "question_number": 1,
            "question_text": "The question as written",
            "student_answer": "What the student wrote",
            "correct_answer": "The correct answer",
            "is_correct": true/false,
            "partial_credit": 0.0 to 1.0,
            "explanation": "Why this is correct/incorrect"
        }}
    ],
    "correct_answers": <number>,
    "score": <percentage 0-100>,
    "topics_identified": ["topic1", "topic2"],
    "weak_areas": ["area needing improvement"],
    "strong_areas": ["areas of strength"],
    "feedback": "Overall feedback for the student",
    "parent_suggestions": ["Suggestions for parent to help child improve"]
}}

Be encouraging but accurate. Identify specific topics and skills being tested."""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000
        )

        content = response.choices[0].message.content

        # Parse JSON from response
        try:
            # Find JSON in response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Return raw response if JSON parsing fails
        return {
            "raw_response": content,
            "parse_error": True
        }

    async def generate_worksheet(
        self,
        topic: str,
        subject: str,
        difficulty: str = "medium",
        question_count: int = 10,
        grade_level: str = "6th"
    ) -> Dict[str, Any]:
        """Generate a practice worksheet for a specific topic."""
        self._ensure_client()

        prompt = f"""Generate a practice worksheet for a {grade_level} grade student.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Number of questions: {question_count}

Generate questions in the following JSON format:
{{
    "title": "Practice Worksheet: {topic}",
    "instructions": "Clear instructions for the student",
    "questions": [
        {{
            "question_number": 1,
            "question_type": "calculation/multiple_choice/fill_blank/short_answer",
            "question": "The question text",
            "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // For multiple choice only
            "answer": "The correct answer",
            "hint": "A helpful hint",
            "points": 1,
            "skill_tested": "The specific skill being tested"
        }}
    ],
    "total_points": <sum of all points>,
    "estimated_time_minutes": <estimated completion time>
}}

Make questions progressively harder. Include a mix of question types appropriate for the topic.
For {difficulty} difficulty:
- easy: basic recall and simple application
- medium: application and some analysis
- hard: analysis and problem-solving"""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000
        )

        content = response.choices[0].message.content

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        return {"raw_response": content, "parse_error": True}

    async def grade_worksheet(self, image_base64: str, answer_key: List[Dict]) -> Dict[str, Any]:
        """Grade a completed worksheet by comparing to answer key."""
        self._ensure_client()

        answer_key_str = json.dumps(answer_key, indent=2)

        prompt = f"""Grade this completed worksheet. Here is the answer key:

{answer_key_str}

Analyze the student's work in the image and provide grading in this JSON format:
{{
    "total_questions": <number>,
    "questions_answered": <number>,
    "question_results": [
        {{
            "question_number": 1,
            "student_answer": "what the student wrote",
            "correct_answer": "from answer key",
            "is_correct": true/false,
            "partial_credit": 0.0 to 1.0,
            "feedback": "specific feedback for this question"
        }}
    ],
    "correct_answers": <number>,
    "score": <percentage 0-100>,
    "areas_mastered": ["topics the student understands well"],
    "areas_to_improve": ["topics needing more practice"],
    "overall_feedback": "Encouraging overall feedback",
    "next_steps": ["Specific recommendations for improvement"]
}}

Be fair in grading - give partial credit where appropriate for work shown."""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000
        )

        content = response.choices[0].message.content

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        return {"raw_response": content, "parse_error": True}

    async def extract_tasks_from_image(self, image_base64: str) -> Dict[str, Any]:
        """Extract tasks from an image (homework assignment, schedule, etc.)."""
        self._ensure_client()

        prompt = """Analyze this image and extract any tasks, assignments, or to-do items.

Return the extracted information in this JSON format:
{
    "tasks": [
        {
            "title": "Short task title",
            "description": "Detailed description",
            "category": "homework/chore/other",
            "subject": "Math/Science/Reading/Other or null",
            "due_date": "YYYY-MM-DD or null if not specified",
            "priority": "high/medium/low",
            "estimated_time_minutes": <number or null>
        }
    ],
    "source_type": "homework_assignment/syllabus/note/schedule/other",
    "additional_notes": "Any other relevant information"
}

Extract all visible tasks and assignments."""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500
        )

        content = response.choices[0].message.content

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        return {"raw_response": content, "parse_error": True}

    async def get_parent_suggestions(
        self,
        child_name: str,
        weak_areas: List[str],
        recent_scores: List[float],
        subject: str
    ) -> Dict[str, Any]:
        """Get AI-powered suggestions for parents to help their child."""
        self._ensure_client()

        prompt = f"""As an educational advisor, provide suggestions for a parent to help their child.

Child: {child_name}
Subject: {subject}
Weak areas identified: {', '.join(weak_areas)}
Recent scores: {recent_scores}

Provide suggestions in this JSON format:
{{
    "summary": "Brief assessment of child's current level",
    "daily_activities": [
        {{
            "activity": "Description of activity",
            "duration_minutes": 15,
            "resources_needed": ["list of resources"],
            "how_it_helps": "Explanation of benefit"
        }}
    ],
    "weekly_goals": ["Specific achievable goals"],
    "resources": [
        {{
            "name": "Resource name",
            "type": "app/website/book/game",
            "description": "How to use it",
            "link": "URL if applicable"
        }}
    ],
    "encouragement_tips": ["Tips for keeping child motivated"],
    "warning_signs": ["Signs that child needs additional help"],
    "celebration_milestones": ["Small wins to celebrate"]
}}

Be practical and age-appropriate. Focus on fun, engaging activities."""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500
        )

        content = response.choices[0].message.content

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        return {"raw_response": content, "parse_error": True}

    async def extract_quran_page_info(self, image_base64: str) -> Dict[str, Any]:
        """Extract Quran page information from an uploaded image."""
        self._ensure_client()

        prompt = """Analyze this image of a Quran page and extract the following information.

Return the information in this JSON format:
{
    "pages_identified": true/false,
    "pages_count": <number of pages visible, usually 1 or 2>,
    "start_page": <page number if visible, or null>,
    "end_page": <ending page number if multiple pages, or null>,
    "surah_name": "Name of the surah being read, or null if not identifiable",
    "surah_number": <surah number if identifiable, or null>,
    "juz_number": <juz/para number if identifiable, or null>,
    "verse_range": "e.g., '1-20' if identifiable, or null",
    "is_quran_page": true/false,
    "confidence": "high/medium/low",
    "notes": "Any additional observations"
}

If this is not a Quran page, set is_quran_page to false and pages_identified to false."""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        content = response.choices[0].message.content

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        return {
            "pages_identified": False,
            "pages_count": 1,
            "is_quran_page": False,
            "parse_error": True
        }


# Global instance
ai_service = AIService()

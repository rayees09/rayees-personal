import { Link } from 'react-router-dom';
import {
  Users, Moon, CheckSquare, BookOpen, Star, Wallet,
  Bell, Target, GraduationCap, ArrowRight
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-900 to-teal-900">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-full mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Family Hub
          </h1>
          <p className="text-xl text-green-200 max-w-2xl mx-auto">
            Your complete family management app. Track prayers, manage tasks,
            monitor learning progress, and stay organized together.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            to="/login"
            className="px-8 py-4 bg-white text-green-800 rounded-xl font-semibold text-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
          >
            Sign In
            <ArrowRight size={20} />
          </Link>
          <Link
            to="/register"
            className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-500 transition border-2 border-green-500 flex items-center justify-center gap-2"
          >
            Register Your Family
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <FeatureCard
            icon={<Moon className="w-8 h-8" />}
            title="Prayer Tracking"
            description="Track daily prayers for the whole family. Never miss a prayer with reminders."
            color="bg-purple-500"
          />
          <FeatureCard
            icon={<CheckSquare className="w-8 h-8" />}
            title="Task Management"
            description="Assign tasks to family members with points and rewards system."
            color="bg-blue-500"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Quran Progress"
            description="Track Quran memorization and reading goals for each family member."
            color="bg-teal-500"
          />
          <FeatureCard
            icon={<GraduationCap className="w-8 h-8" />}
            title="Learning Center"
            description="AI-powered homework analysis and custom worksheet generation."
            color="bg-orange-500"
          />
          <FeatureCard
            icon={<Star className="w-8 h-8" />}
            title="Points & Rewards"
            description="Motivate kids with a points system and exciting rewards."
            color="bg-yellow-500"
          />
          <FeatureCard
            icon={<Wallet className="w-8 h-8" />}
            title="Expense Tracking"
            description="Track family expenses and manage your budget together."
            color="bg-green-500"
          />
          <FeatureCard
            icon={<Bell className="w-8 h-8" />}
            title="Reminders"
            description="Set family reminders for appointments, events, and more."
            color="bg-red-500"
          />
          <FeatureCard
            icon={<Target className="w-8 h-8" />}
            title="Goal Setting"
            description="Set and track goals for Ramadan, Quran reading, and personal growth."
            color="bg-indigo-500"
          />
          <FeatureCard
            icon={<Moon className="w-8 h-8" />}
            title="Ramadan Mode"
            description="Special features for Ramadan including fasting logs and taraweeh tracking."
            color="bg-amber-500"
          />
        </div>

        {/* How It Works */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step number={1} title="Register" description="Create your family account with a simple registration" />
            <Step number={2} title="Add Members" description="Add parents and children to your family" />
            <Step number={3} title="Start Using" description="Track prayers, tasks, learning, and more!" />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to get started?
          </h3>
          <p className="text-green-200 mb-6">
            Join thousands of families managing their daily lives with Family Hub.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-800 rounded-xl font-semibold text-lg hover:bg-green-50 transition"
          >
            Register Your Family Free
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-green-300 text-sm">
          <p>&copy; 2024 Family Hub. All rights reserved.</p>
          <p className="mt-2">
            <Link to="/admin/login" className="hover:underline">Admin Login</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/15 transition">
      <div className={`${color} w-14 h-14 rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-green-200 text-sm">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-white text-green-800 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-green-200 text-sm">{description}</p>
    </div>
  );
}

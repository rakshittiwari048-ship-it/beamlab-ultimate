/**
 * Dashboard.tsx
 * 
 * Module Hub Dashboard - The first screen after login
 * Features:
 * - Thin dark icon sidebar (Home, Projects, Account, Settings)
 * - Welcome section with action bar
 * - Recent files table
 * - Module launcher grid (Structural 3D, RC Design, Steel Design, Connection)
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  FolderOpen,
  User,
  Settings,
  Plus,
  Upload,
  Box,
  Columns,
  Wrench,
  Layers,
  Clock,
  FileText,
  MoreVertical,
  Search,
  Bell,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: string;
  name: string;
  type: '3D Frame' | 'Truss' | 'RC Design' | 'Steel Design';
  lastModified: string;
  status: 'Draft' | 'Final' | 'In Review';
}

// ============================================================================
// ICON SIDEBAR
// ============================================================================

function IconSidebar() {
  const [activeItem, setActiveItem] = useState('home');

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
    { id: 'projects', icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
    { id: 'account', icon: User, label: 'Account', href: '/dashboard/account' },
    { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 z-40">
      {/* Logo */}
      <Link to="/" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-8">
        <Box className="w-5 h-5 text-white" />
      </Link>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setActiveItem(item.id)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div className="mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all">
          E
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// TOP BAR
// ============================================================================

function TopBar() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">Engineer</div>
            <div className="text-xs text-gray-500">Pro Plan</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
            E
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// WELCOME SECTION
// ============================================================================

function WelcomeSection() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, Engineer.
        </h1>
        <p className="text-gray-500 mt-1">
          What would you like to work on today?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6 flex gap-3"
      >
        <button
          onClick={() => navigate('/workspace/3d')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg transition-colors">
          <Upload className="w-4 h-4" />
          Open File
        </button>
      </motion.div>
    </div>
  );
}

// ============================================================================
// RECENT FILES TABLE
// ============================================================================

function RecentFilesTable() {
  const recentProjects: Project[] = [
    { id: '1', name: 'Steel Portal Frame - Client A', type: '3D Frame', lastModified: '2 hours ago', status: 'Draft' },
    { id: '2', name: 'Warehouse Truss Analysis', type: 'Truss', lastModified: 'Yesterday', status: 'Final' },
    { id: '3', name: 'RC Beam Design - Residential', type: 'RC Design', lastModified: '3 days ago', status: 'In Review' },
    { id: '4', name: 'Connection Check - Project B', type: 'Steel Design', lastModified: '1 week ago', status: 'Final' },
  ];

  const statusColors: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-700',
    Final: 'bg-green-100 text-green-700',
    'In Review': 'bg-blue-100 text-blue-700',
  };

  const typeIcons: Record<string, typeof Box> = {
    '3D Frame': Box,
    Truss: Layers,
    'RC Design': Columns,
    'Steel Design': Wrench,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8"
    >
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Files</h2>
        </div>
        <Link to="/dashboard/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {recentProjects.map((project) => {
            const TypeIcon = typeIcons[project.type] || FileText;
            return (
              <tr
                key={project.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <TypeIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{project.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{project.lastModified}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

// ============================================================================
// MODULE LAUNCHER GRID
// ============================================================================

function ModuleLauncherGrid() {
  const navigate = useNavigate();

  const modules = [
    {
      id: '3d',
      title: 'Structural 3D',
      description: '3D Frame & Truss Analysis',
      icon: Box,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'hover:border-blue-300',
      route: '/workspace/3d',
    },
    {
      id: 'rc',
      title: 'RC Design',
      description: 'Beam, Column & Slab Design',
      icon: Columns,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'hover:border-orange-300',
      route: '/workspace/rc-design',
    },
    {
      id: 'steel',
      title: 'Steel Design',
      description: 'Member Design & Optimization',
      icon: Wrench,
      color: 'gray',
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
      borderColor: 'hover:border-gray-400',
      route: '/workspace/steel-design',
    },
    {
      id: 'connection',
      title: 'Connection',
      description: 'Base Plates & Shear Tabs',
      icon: Layers,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'hover:border-purple-300',
      route: '/workspace/connection',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">Launch Module</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <motion.button
              key={module.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(module.route)}
              className={`bg-white rounded-xl p-6 border-2 border-gray-200 ${module.borderColor} text-left transition-all hover:shadow-lg group`}
            >
              <div className={`w-12 h-12 ${module.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${module.iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{module.description}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Helmet>
        <title>Dashboard — BeamLab</title>
      </Helmet>

      {/* Icon Sidebar */}
      <IconSidebar />

      {/* Main Content */}
      <div className="ml-16">
        <TopBar />

        <main className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <WelcomeSection />
            <RecentFilesTable />
            <ModuleLauncherGrid />
          </div>
        </main>
      </div>
    </div>
  );
}

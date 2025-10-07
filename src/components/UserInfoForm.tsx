'use client'

import { useState } from 'react'
import { UserInfo, supabaseDb } from '@/lib/supabase'

interface UserInfoFormProps {
  onSubmit: (userInfo: UserInfo) => void
}

export default function UserInfoForm({ onSubmit }: UserInfoFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin_url: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Please enter a valid LinkedIn URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      try {
        console.log('Creating user:', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          linkedin_url: formData.linkedin_url.trim() || undefined,
        })

        // Create or update user in Supabase
        const { data, error } = await supabaseDb.createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          linkedin_url: formData.linkedin_url.trim() || undefined,
        })

        console.log('User creation result:', { data, error })

        if (error) {
          console.error('Error creating user:', error)
          // Show error to user but still allow quiz to proceed
          alert('Warning: Could not save user information. Quiz will continue but results may not be saved.')
        }

        const userInfo = {
          id: data?.[0]?.id || data?.id || 'temp-user-id',
          name: formData.name.trim(),
          email: formData.email.trim(),
          linkedin_url: formData.linkedin_url.trim() || undefined
        }

        console.log('Submitting user info:', userInfo)
        onSubmit(userInfo)
      } catch (error) {
        console.error('Error submitting form:', error)
        // Still proceed with the form submission even if database fails
        onSubmit({
          name: formData.name.trim(),
          email: formData.email.trim(),
          linkedin_url: formData.linkedin_url.trim() || undefined
        })
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Let&apos;s Get Started
        </h2>
        <p className="text-gray-600">
          Please provide your information to begin the quiz
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-500 bg-white ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-500 bg-white ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="linkedin_url" className="block text-sm font-semibold text-gray-700 mb-2">
            LinkedIn Profile (Optional)
          </label>
          <input
            type="url"
            id="linkedin_url"
            name="linkedin_url"
            value={formData.linkedin_url}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-500 bg-white ${
              errors.linkedin_url ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://linkedin.com/in/your-profile"
          />
          {errors.linkedin_url && (
            <p className="mt-1 text-sm text-red-600">{errors.linkedin_url}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-4 px-6 rounded-lg hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Start Quiz
        </button>
      </form>

      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Quiz Information</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 50 multiple choice questions</li>
              <li>• 15 minute time limit</li>
              <li>• Questions cover various topics</li>
              <li>• You can review your answers before submitting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

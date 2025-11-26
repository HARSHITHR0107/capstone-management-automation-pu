import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/user';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    confirmPassword: '',
    role: 'student' as UserRole,
    specialization: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const validateStudentEmail = (email: string): boolean => {
    // Convert to lowercase for case-insensitive validation
    const lowerEmail = email.toLowerCase();
    // Pattern: firstname.rollnumber@presidencyuniversity.in (roll number can be alphanumeric)
    const studentEmailPattern = /^[a-z]+\.[a-z0-9]+@presidencyuniversity\.in$/;
    return studentEmailPattern.test(lowerEmail);
  };

  const extractRollNumberFromEmail = (email: string): string => {
    // Convert to lowercase for extraction
    const lowerEmail = email.toLowerCase();
    const match = lowerEmail.match(/^[a-z]+\.([a-z0-9]+)@presidencyuniversity\.in$/);
    return match ? match[1].toUpperCase() : ''; // Return in uppercase to match original format
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });

    // Auto-extract roll number for students
    if (formData.role === 'student' && validateStudentEmail(email)) {
      const rollNo = extractRollNumberFromEmail(email);
      setFormData(prev => ({ ...prev, email, rollNo }));
    } else if (formData.role === 'student') {
      // Clear roll number if email is invalid
      setFormData(prev => ({ ...prev, email, rollNo: '' }));
    }
  };

  // Verify user exists in Firebase with matching role
  const verifyUserInFirebase = async (email: string, role: UserRole): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return false;
      }

      // Check if any matching user has the correct role
      let roleMatches = false;
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === role) {
          roleMatches = true;
        }
      });

      return roleMatches;
    } catch (error) {
      console.error('Error verifying user in Firebase:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Validate student email format
    if (formData.role === 'student') {
      if (!validateStudentEmail(formData.email)) {
        setError('Student email must be in format: FirstName.RollNumber@presidencyuniversity.in (e.g., manideep.20221CIT0091@presidencyuniversity.in). Letters can be in any case.');
        return;
      }
      if (!formData.rollNo) {
        setError('Roll number is required for students');
        return;
      }
    }

    // Validate other roles have normal email
    if (formData.role !== 'student') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    // Validate faculty specialization
    if (formData.role === 'faculty' && !formData.specialization) {
      setError('Please select your specialization');
      return;
    }

    // Verify user exists in Firebase with matching role (except for students)
    if (formData.role !== 'student') {
      console.log('Verifying user in Firebase...');
      const userExists = await verifyUserInFirebase(formData.email, formData.role);

      if (!userExists) {
        setError(`No ${formData.role} account found with this email address in the system. Please contact the administrator to be added first.`);
        return;
      }
      console.log('User verified in Firebase');
    }

    console.log('Form submitted, calling signup...');

    try {
      const success = await signup(formData);
      console.log('Signup result:', success);

      if (success) {
        console.log('Signup successful, role:', formData.role);
        if (formData.role === 'admin') {
          console.log('Admin account created - PublicRoute will redirect to dashboard');
          // Don't navigate here - let PublicRoute handle it
        } else if (formData.role === 'student' && formData.email.toLowerCase().endsWith('@presidencyuniversity.in')) {
          console.log('College student account created - auto-verified, redirecting to dashboard');
          // Don't navigate here - let PublicRoute handle it
        } else {
          console.log('Showing success message for non-admin');
          setSuccess(`Account created successfully! 

Next steps:
1. Check your email for verification link
2. Wait for admin approval
3. Once approved, you can log in

Please contact the administrator if you don't receive approval within 24 hours.`);
        }
      } else {
        console.log('Signup returned false');
        setError('Account creation failed. The email may already be in use or there was a connection error. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Signup error caught:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please login instead.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/password accounts are not enabled. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error?.message || 'Failed to create account. Please try again.');
      }
    }
  };

  const isStudentEmailValid = formData.role === 'student' ? validateStudentEmail(formData.email) : true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join the Capstone Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value, email: '', rollNo: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty Guide</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email
                {formData.role === 'student' && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Format: FirstName.RollNumber@presidencyuniversity.in)
                  </span>
                )}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                placeholder={
                  formData.role === 'student'
                    ? "e.g., manideep.20221CIT0091@presidencyuniversity.in"
                    : "Enter your email"
                }
                className={formData.role === 'student' && formData.email && !isStudentEmailValid ? 'border-red-500' : ''}
              />
              {formData.role === 'student' && formData.email && (
                <div className="text-xs">
                  {isStudentEmailValid ? (
                    <p className="text-green-600">✓ Valid university email format</p>
                  ) : (
                    <p className="text-red-600">✗ Invalid format. Use: firstname.rollnumber@presidencyuniversity.in</p>
                  )}
                </div>
              )}
            </div>

            {formData.role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll Number</Label>
                <Input
                  id="rollNo"
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  required
                  placeholder="Roll number (letters and numbers)"
                  disabled={isStudentEmailValid && Boolean(formData.rollNo)}
                />
                {isStudentEmailValid && formData.rollNo && (
                  <p className="text-xs text-green-600">✓ Roll number auto-extracted from email</p>
                )}
              </div>
            )}

            {formData.role === 'faculty' && (
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Select value={formData.specialization} onValueChange={(value) => setFormData({ ...formData, specialization: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Mechanical">Mechanical</SelectItem>
                    <SelectItem value="Civil">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                placeholder="Confirm password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="whitespace-pre-line text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              Already have an account? Sign in
            </Button>
          </div>

          {formData.role === 'student' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-xs">
              <p className="font-semibold mb-1">Student Email Format (Case Insensitive):</p>
              <p>FirstName.RollNumber@presidencyuniversity.in</p>
              <div className="text-blue-600 mt-1 space-y-1">
                <p>✓ manideep.20221CIT0091@presidencyuniversity.in</p>
                <p>✓ MANIDEEP.20221CIT0091@presidencyuniversity.in</p>
                <p>✓ Manideep.20221CIT0091@presidencyuniversity.in</p>
                <p>✓ john.2022CSE001@presidencyuniversity.in</p>
              </div>
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-green-700 font-semibold">✓ College email = Auto-verified!</p>
                <p className="text-green-600">No admin approval needed - Login immediately after signup</p>
              </div>
            </div>
          )}

          {formData.role !== 'student' && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md text-xs border border-yellow-200">
              <p className="font-semibold mb-1 text-yellow-800">⚠️ Important for Faculty and Admin:</p>
              <p className="text-yellow-700">Your email must already exist in the system with the correct role. Contact the administrator if you need to be added.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
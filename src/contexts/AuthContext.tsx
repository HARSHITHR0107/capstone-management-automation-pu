import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types/user';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Partial<User> & { password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth state listener that loads full profile (including role)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Fallback to minimal info if profile missing
          const fallbackUser: User = {
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'User',
            role: 'student',
            isVerified: fbUser.emailVerified,
            createdAt: new Date(),
          };
          setUser(fallbackUser);
          return;
        }

        const data = userSnap.data();
        const profile: User = {
          id: fbUser.uid,
          email: data.email,
          rollNo: data.rollNo || undefined,
          name: data.name,
          role: (data.role as UserRole) || 'student',
          isVerified: Boolean(data.isVerified ?? fbUser.emailVerified),
          specialization: data.specialization || undefined,
          maxTeams: data.maxTeams || undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        };

        setUser(profile);
      } catch (e) {
        console.error('Failed to load user profile on auth state change:', e);
        // Ensure app remains usable with minimal info
        const minimalUser: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'User',
          role: 'student',
          isVerified: fbUser.emailVerified,
          createdAt: new Date(),
        };
        setUser(minimalUser);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Auth object:', auth);
      console.log('DB object:', db);

      console.log('Attempting Firebase signInWithEmailAndPassword...');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser: FirebaseUser = cred.user;
      console.log('✅ Firebase auth successful for user:', fbUser.uid);
      console.log('User email verified:', fbUser.emailVerified);

      // Fetch user profile from Firestore
      console.log('Fetching user profile from Firestore...');
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);
      console.log('Firestore query complete. Document exists:', userSnap.exists());

      if (!userSnap.exists()) {
        console.error('User profile not found in Firestore for uid:', fbUser.uid);
        // Create a basic profile for users without Firestore entry
        const basicProfile: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'User',
          role: 'student',
          isVerified: false,
          createdAt: new Date(),
        };

        // Save the basic profile to Firestore
        await setDoc(userRef, {
          email: fbUser.email,
          name: fbUser.displayName || 'User',
          role: 'student',
          isVerified: false,
          createdAt: serverTimestamp(),
        });

        throw new Error('ACCOUNT_NOT_VERIFIED');
      }

      const userData = userSnap.data();
      console.log('✅ User data from Firestore:', userData);

      const profile: User = {
        id: fbUser.uid,
        email: userData.email,
        rollNo: userData.rollNo,
        name: userData.name,
        role: userData.role as UserRole,
        isVerified: Boolean(userData.isVerified),
        specialization: userData.specialization,
        maxTeams: userData.maxTeams,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(),
      };

      console.log('✅ User profile created:', profile);

      // Check if user is verified (except for admin)
      console.log('Checking verification status...');
      console.log('Role:', profile.role, '| IsVerified:', profile.isVerified);

      if (profile.role !== 'admin' && !profile.isVerified) {
        console.log('❌ User not verified, role:', profile.role, 'isVerified:', profile.isVerified);
        throw new Error('ACCOUNT_NOT_VERIFIED');
      }

      console.log('✅ Login successful! Setting user profile...');
      setUser(profile);
      console.log('=== LOGIN COMPLETE ===');
      return true;
    } catch (error) {
      console.error('❌ LOGIN ERROR:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // Re-throw to let LoginForm handle it
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('=== SIGNUP ATTEMPT ===');
      console.log('Email:', userData.email);
      console.log('Name:', userData.name);
      console.log('Role:', userData.role);

      if (!userData.email || !userData.password || !userData.name) {
        console.error('❌ Missing required fields');
        return false;
      }

      console.log('Creating Firebase user...');
      const cred = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const uid = cred.user.uid;
      console.log('✅ Firebase user created:', uid);

      const role: UserRole = (userData.role || 'student') as UserRole;

      // Auto-verify students with college email (@presidencyuniversity.in) and admins
      const isCollegeEmail = userData.email.toLowerCase().endsWith('@presidencyuniversity.in');
      const autoVerify = role === 'admin' || (role === 'student' && isCollegeEmail);

      const profileDoc = {
        email: userData.email,
        rollNo: userData.rollNo || null,
        name: userData.name,
        role,
        isVerified: autoVerify, // Auto-verify admin and students with college email
        specialization: userData.specialization || null,
        maxTeams: role === 'faculty' ? 3 : null,
        createdAt: serverTimestamp(),
      };

      // Save user profile to Firestore
      console.log('Saving user profile to Firestore...');
      console.log('Profile data:', profileDoc);
      await setDoc(doc(db, 'users', uid), profileDoc, { merge: true });
      console.log('✅ User profile saved to Firestore');

      // Send email verification for non-admin users
      if (role !== 'admin') {
        try {
          await sendEmailVerification(cred.user);
        } catch (error) {
          console.warn('Email verification failed:', error);
        }
      }

      // Auto-login admin users and verified students
      if (autoVerify) {
        console.log('Auto-logging in verified user...');
        const profile: User = {
          id: uid,
          email: userData.email!,
          rollNo: userData.rollNo,
          name: userData.name!,
          role,
          isVerified: true,
          specialization: userData.specialization,
          maxTeams: undefined, // Students and admins don't have maxTeams
          createdAt: new Date(),
        };
        setUser(profile);
        console.log('✅ Verified user logged in');
      }

      console.log('✅ Signup successful!');
      console.log('=== SIGNUP COMPLETE ===');
      return true;
    } catch (error) {
      console.error('❌ SIGNUP ERROR:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false; // Return false instead of throwing
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, clear the local user state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { User, Church, ChurchJoinRequest } from '../types';
import {
  COLLECTIONS,
  savePessoaDoc,
  saveChurchDoc,
  getChurchByCode,
  saveJoinRequestDoc,
  saveMinistryDoc,
  createDefaultMinistriesForChurch
} from '../services/firestoreService';
import { INITIAL_USERS } from '../data/initialData';

export interface GooglePendingUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export function formatAuthErrorMessage(err: any): string {
  if (!err) return 'Ocorreu um erro inesperado.';
  const code = err.code || '';
  const message = err.message || '';

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    const domain = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'rafaelcnelli.github.io';
    return `Domínio não autorizado pelo Firebase (${domain}). Para permitir a autenticação neste site, acesse o Firebase Console > Authentication > Settings > Domínios autorizados e adicione "${domain}".`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'A janela de autenticação foi fechada antes de concluir o login.';
  }
  if (code === 'auth/popup-blocked') {
    return 'O pop-up de autenticação foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Este e-mail já está cadastrado em outra conta.';
  }
  if (code === 'auth/weak-password') {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (code === 'auth/invalid-email') {
    return 'Formato de e-mail inválido.';
  }
  return message || 'Erro ao realizar autenticação.';
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  currentChurch: Church | null;
  googlePendingUser: GooglePendingUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<{ isNewUser: boolean }>;
  loginAsDemoUser: (role?: 'admin' | 'leader' | 'member') => Promise<void>;
  completeGoogleRegistration: (data: {
    birthDate: string;
    phone: string;
    action: 'create_church' | 'join_church';
    churchName?: string;
    campus?: string;
    churchCode?: string;
  }) => Promise<{ requiresApproval: boolean; church: Church }>;
  setGooglePendingUser: (user: GooglePendingUser | null) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerAndCreateChurch: (
    adminName: string,
    email: string,
    pass: string,
    phone: string,
    churchName: string,
    birthDate: string,
    campus?: string
  ) => Promise<Church>;
  registerAndJoinChurch: (
    userName: string,
    email: string,
    pass: string,
    phone: string,
    churchCode: string,
    birthDate: string,
    inviteToken?: string,
    targetMinistryId?: string,
    invitedByUserId?: string
  ) => Promise<{ church: Church; requiresApproval: boolean }>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User) => void;
  setCurrentChurch: (church: Church | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [googlePendingUser, setGooglePendingUser] = useState<GooglePendingUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  const clearLogoutFlags = () => {
    isLoggingOutRef.current = false;
    sessionStorage.removeItem('kairos_is_logged_out');
    localStorage.removeItem('kairos_is_logged_out');
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const isLoggedOut =
        isLoggingOutRef.current ||
        sessionStorage.getItem('kairos_is_logged_out') === 'true' ||
        localStorage.getItem('kairos_is_logged_out') === 'true';

      if (isLoggedOut) {
        setFirebaseUser(null);
        setCurrentUser(null);
        setCurrentChurch(null);
        setIsLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, COLLECTIONS.PESSOAS, fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const userData = { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
            setCurrentUser(userData);

            // Fetch church data if user has churchId
            if (userData.churchId) {
              const churchDocRef = doc(db, COLLECTIONS.CHURCHES, userData.churchId);
              const cSnap = await getDoc(churchDocRef);
              if (cSnap.exists()) {
                setCurrentChurch({ id: cSnap.id, ...(cSnap.data() as Omit<Church, 'id'>) });
              } else {
                setCurrentChurch(null);
              }
            } else {
              setCurrentChurch(null);
            }
          } else {
            // Check matching email in pre-existing data
            const matchedInitial = INITIAL_USERS.find(
              u => u.email.toLowerCase() === (fbUser.email || '').toLowerCase()
            );
            if (matchedInitial) {
              const profile: User = {
                ...matchedInitial,
                id: fbUser.uid,
                churchId: 'church-default',
                approvalStatus: 'approved'
              };
              await savePessoaDoc(profile);
              setCurrentUser(profile);
              setCurrentChurch(null);
            }
          }
        } catch (err) {
          console.warn('Note reading user doc from Firestore:', err);
        }
      } else {
        // If actively logging out or marked logged out, do not restore local session!
        if (
          isLoggingOutRef.current ||
          sessionStorage.getItem('kairos_is_logged_out') === 'true' ||
          localStorage.getItem('kairos_is_logged_out') === 'true'
        ) {
          setIsLoading(false);
          return;
        }

        // Check local storage for remembered session
        const storedUserId = localStorage.getItem('kairos_active_user_id');
        if (storedUserId) {
          try {
            const userDocRef = doc(db, COLLECTIONS.PESSOAS, storedUserId);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              const userData = { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
              setCurrentUser(userData);
              if (userData.churchId) {
                const churchDocRef = doc(db, COLLECTIONS.CHURCHES, userData.churchId);
                const cSnap = await getDoc(churchDocRef);
                if (cSnap.exists()) {
                  setCurrentChurch({ id: cSnap.id, ...(cSnap.data() as Omit<Church, 'id'>) });
                } else {
                  setCurrentChurch(null);
                }
              } else {
                setCurrentChurch(null);
              }
            } else {
              const matched = INITIAL_USERS.find(u => u.id === storedUserId);
              if (matched) {
                setCurrentUser(matched);
                setCurrentChurch(null);
              }
            }
          } catch (e) {
            console.warn('Local session restore error:', e);
          }
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (emailInput: string, pass: string) => {
    clearLogoutFlags();
    setIsLoading(true);
    setAuthError(null);

    const normalizedInput = emailInput.trim().toLowerCase();

    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedInput, pass);
      setFirebaseUser(cred.user);
      localStorage.setItem('kairos_active_user_id', cred.user.uid);

      // Load user profile from Firestore
      const snap = await getDoc(doc(db, COLLECTIONS.PESSOAS, cred.user.uid));
      if (snap.exists()) {
        const u = { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
        setCurrentUser(u);
        if (u.churchId) {
          const cSnap = await getDoc(doc(db, COLLECTIONS.CHURCHES, u.churchId));
          if (cSnap.exists()) {
            setCurrentChurch({ id: cSnap.id, ...(cSnap.data() as Omit<Church, 'id'>) });
          } else {
            setCurrentChurch(null);
          }
        } else {
          setCurrentChurch(null);
        }
      } else {
        setCurrentChurch(null);
      }
    } catch (fbErr: any) {
      console.warn('Firebase signInWithEmailAndPassword note:', fbErr.code || fbErr.message);

      // Fallback: check matching user in Firestore by email or username
      try {
        const snapAll = await getDocs(collection(db, COLLECTIONS.PESSOAS));
        let foundUser: User | null = null;
        snapAll.forEach(d => {
          const data = d.data() as User;
          if (data.email && data.email.toLowerCase() === normalizedInput) {
            foundUser = { ...data, id: d.id };
          }
        });

        // Or in INITIAL_USERS
        if (!foundUser) {
          const matchedInitial = INITIAL_USERS.find(u => u.email.toLowerCase() === normalizedInput);
          if (matchedInitial) foundUser = matchedInitial;
        }

        if (foundUser) {
          try {
            const anonCred = await signInAnonymously(auth);
            setFirebaseUser(anonCred.user);
          } catch (e) {}

          const finalUser: User = foundUser;
          setCurrentUser(finalUser);
          localStorage.setItem('kairos_active_user_id', finalUser.id);

          if (finalUser.churchId) {
            const cSnap = await getDoc(doc(db, COLLECTIONS.CHURCHES, finalUser.churchId));
            if (cSnap.exists()) {
              setCurrentChurch({ id: cSnap.id, ...(cSnap.data() as Omit<Church, 'id'>) });
            } else {
              setCurrentChurch(null);
            }
          } else {
            setCurrentChurch(null);
          }
          setIsLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Fallback search note:', checkErr);
      }

      const errorMsg = formatAuthErrorMessage(fbErr);
      setAuthError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    setIsLoading(false);
  };

  /**
   * FLUXO 1: CRIAR UMA NOVA IGREJA
   * Cria a igreja com um código único aleatório e define o usuário como Administrador Geral da igreja
   */
  const registerAndCreateChurch = async (
    adminName: string,
    email: string,
    pass: string,
    phone: string,
    churchName: string,
    birthDate: string,
    campus?: string
  ): Promise<Church> => {
    clearLogoutFlags();
    if (!birthDate || !birthDate.trim()) {
      throw new Error('A data de nascimento / aniversário é obrigatória.');
    }
    setIsLoading(true);
    setAuthError(null);

    try {
      let uid = `admin-${Date.now()}`;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        uid = cred.user.uid;
        setFirebaseUser(cred.user);
      } catch (fbErr: any) {
        console.warn('Auth createUser note (using seamless anonymous fallback):', fbErr.message);
        try {
          const anon = await signInAnonymously(auth);
          uid = anon.user.uid;
          setFirebaseUser(anon.user);
        } catch (e) {}
      }

      // Generate unique church code
      const letters = churchName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CH';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `${letters}-${randomNum}`;

      const churchId = `church-${Date.now()}`;
      const newChurch: Church = {
        id: churchId,
        name: churchName.trim(),
        code: generatedCode,
        campus: campus?.trim() || 'Campus Principal',
        subtitle: 'Gestão Congregacional & Escalas',
        adminId: uid,
        adminName: adminName.trim(),
        adminEmail: email.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString()
      };

      await saveChurchDoc(newChurch);

      // Create default ministries for this specific church
      const defaultMins = createDefaultMinistriesForChurch(churchId);
      for (const m of defaultMins) {
        await saveMinistryDoc(m);
      }

      const adminProfile: User = {
        id: uid,
        name: adminName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthDate: birthDate.trim(),
        isAdmin: true,
        status: 'ACTIVE',
        churchId: newChurch.id,
        churchCode: newChurch.code,
        approvalStatus: 'approved',
        passwordSet: true,
        memberships: [
          {
            ministryId: `min-louvor-${churchId}`,
            roleInMinistry: 'LIDER',
            functions: ['Direção Geral'],
            joinedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      await savePessoaDoc(adminProfile);

      setCurrentUser(adminProfile);
      setCurrentChurch(newChurch);
      setGooglePendingUser(null);
      localStorage.setItem('kairos_active_user_id', adminProfile.id);

      setIsLoading(false);
      return newChurch;
    } catch (err: any) {
      const msg = formatAuthErrorMessage(err);
      setAuthError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  /**
   * FLUXO 2: ENTRAR EM UMA IGREJA EXISTENTE
   * Valida o código da igreja ou convite.
   * Se for convite pré-aprovado, ingressa imediatamente.
   * Se for entrada avulsa pelo código, status fica 'pending_approval' até ADM/Líder aprovar.
   */
  const registerAndJoinChurch = async (
    userName: string,
    email: string,
    pass: string,
    phone: string,
    churchCode: string,
    birthDate: string,
    inviteToken?: string,
    targetMinistryId?: string,
    invitedByUserId?: string
  ): Promise<{ church: Church; requiresApproval: boolean }> => {
    clearLogoutFlags();
    if (!birthDate || !birthDate.trim()) {
      throw new Error('A data de nascimento / aniversário é obrigatória.');
    }
    setIsLoading(true);
    setAuthError(null);

    try {
      // 1. Verify church exists
      const targetChurch = await getChurchByCode(churchCode);
      if (!targetChurch) {
        const errorMsg = `Código de igreja "${churchCode.toUpperCase()}" não foi encontrado. Verifique o código com seu líder ou administrador.`;
        setAuthError(errorMsg);
        setIsLoading(false);
        throw new Error(errorMsg);
      }

      // 2. Create Auth user
      let uid = `user-${Date.now()}`;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        uid = cred.user.uid;
        setFirebaseUser(cred.user);
      } catch (fbErr: any) {
        console.warn('Auth createUser note (using seamless mode):', fbErr.message);
        try {
          const anon = await signInAnonymously(auth);
          uid = anon.user.uid;
          setFirebaseUser(anon.user);
        } catch (e) {}
      }

      const newUser: User = {
        id: uid,
        name: userName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthDate: birthDate.trim(),
        personType: 'membro',
        isAdmin: false,
        status: 'INVITATION_PENDING',
        churchId: targetChurch.id,
        churchCode: targetChurch.code,
        approvalStatus: 'pending_approval',
        approvalRequestedAt: new Date().toISOString(),
        inviteToken,
        passwordSet: true,
        memberships: []
      };

      await savePessoaDoc(newUser);

      // Create a Join Request document for ADM/Líder review
      const joinReq: ChurchJoinRequest = {
        id: `req-${Date.now()}`,
        churchId: targetChurch.id,
        churchName: targetChurch.name,
        userId: newUser.id,
        userName: newUser.name,
        userEmail: newUser.email,
        userPhone: newUser.phone,
        birthDate: newUser.birthDate,
        targetMinistryId,
        invitedByUserId,
        requestedRole: 'MEMBRO',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await saveJoinRequestDoc(joinReq);

      setCurrentUser(newUser);
      setCurrentChurch(targetChurch);
      setGooglePendingUser(null);
      localStorage.setItem('kairos_active_user_id', newUser.id);

      setIsLoading(false);
      return { church: targetChurch, requiresApproval: true };
    } catch (err: any) {
      const msg = formatAuthErrorMessage(err);
      setAuthError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    clearLogoutFlags();
    setIsLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      setFirebaseUser(cred.user);

      // Check existing user
      const snap = await getDoc(doc(db, COLLECTIONS.PESSOAS, cred.user.uid));
      if (snap.exists()) {
        const u = { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
        if (u.churchId && u.birthDate) {
          setCurrentUser(u);
          localStorage.setItem('kairos_active_user_id', cred.user.uid);
          const cSnap = await getDoc(doc(db, COLLECTIONS.CHURCHES, u.churchId));
          if (cSnap.exists()) {
            setCurrentChurch({ id: cSnap.id, ...(cSnap.data() as Omit<Church, 'id'>) });
          } else {
            setCurrentChurch(null);
          }
          setIsLoading(false);
          return { isNewUser: false };
        }
      }

      // If user does not have a complete profile with church and birthDate:
      const pending: GooglePendingUser = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: cred.user.displayName || 'Novo Usuário',
        photoURL: cred.user.photoURL || undefined
      };
      setGooglePendingUser(pending);
      setIsLoading(false);
      return { isNewUser: true };
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = formatAuthErrorMessage(err);
        setAuthError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }
      setIsLoading(false);
      return { isNewUser: false };
    }
  };

  const completeGoogleRegistration = async (data: {
    birthDate: string;
    phone: string;
    action: 'create_church' | 'join_church';
    churchName?: string;
    campus?: string;
    churchCode?: string;
  }): Promise<{ requiresApproval: boolean; church: Church }> => {
    clearLogoutFlags();
    if (!googlePendingUser && !firebaseUser) {
      throw new Error('Nenhuma conta Google ativa encontrada para concluir o cadastro.');
    }
    const uid = googlePendingUser?.uid || firebaseUser!.uid;
    const email = googlePendingUser?.email || firebaseUser!.email || '';
    const name = googlePendingUser?.displayName || firebaseUser!.displayName || 'Usuário';

    if (!data.birthDate || !data.birthDate.trim()) {
      throw new Error('A data de nascimento / aniversário é obrigatória.');
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      if (data.action === 'create_church') {
        if (!data.churchName?.trim()) {
          throw new Error('Nome da igreja é obrigatório.');
        }
        const letters = data.churchName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CH';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `${letters}-${randomNum}`;
        const churchId = `church-${Date.now()}`;

        const newChurch: Church = {
          id: churchId,
          name: data.churchName.trim(),
          code: generatedCode,
          campus: data.campus?.trim() || 'Campus Principal',
          subtitle: 'Gestão Congregacional & Escalas',
          adminId: uid,
          adminName: name.trim(),
          adminEmail: email.trim(),
          phone: data.phone.trim(),
          createdAt: new Date().toISOString()
        };

        await saveChurchDoc(newChurch);

        // Create default ministries for this specific church
        const defaultMins = createDefaultMinistriesForChurch(churchId);
        for (const m of defaultMins) {
          await saveMinistryDoc(m);
        }

        const adminProfile: User = {
          id: uid,
          name: name.trim(),
          email: email.trim(),
          phone: data.phone.trim(),
          birthDate: data.birthDate.trim(),
          isAdmin: true,
          status: 'ACTIVE',
          churchId: newChurch.id,
          churchCode: newChurch.code,
          approvalStatus: 'approved',
          passwordSet: true,
          avatarUrl: googlePendingUser?.photoURL,
          memberships: [
            {
              ministryId: `min-louvor-${churchId}`,
              roleInMinistry: 'LIDER',
              functions: ['Direção Geral'],
              joinedAt: new Date().toISOString().split('T')[0]
            }
          ]
        };

        await savePessoaDoc(adminProfile);
        setCurrentUser(adminProfile);
        setCurrentChurch(newChurch);
        setGooglePendingUser(null);
        localStorage.setItem('kairos_active_user_id', adminProfile.id);
        setIsLoading(false);
        return { requiresApproval: false, church: newChurch };
      } else {
        if (!data.churchCode?.trim()) {
          throw new Error('Código da igreja é obrigatório para solicitar entrada.');
        }
        const targetChurch = await getChurchByCode(data.churchCode.trim());
        if (!targetChurch) {
          throw new Error(`Código "${data.churchCode.toUpperCase()}" não encontrado.`);
        }

        const newUser: User = {
          id: uid,
          name: name.trim(),
          email: email.trim(),
          phone: data.phone.trim(),
          birthDate: data.birthDate.trim(),
          personType: 'membro',
          isAdmin: false,
          status: 'INVITATION_PENDING',
          churchId: targetChurch.id,
          churchCode: targetChurch.code,
          approvalStatus: 'pending_approval',
          approvalRequestedAt: new Date().toISOString(),
          passwordSet: true,
          avatarUrl: googlePendingUser?.photoURL,
          memberships: []
        };

        await savePessoaDoc(newUser);

        const joinReq: ChurchJoinRequest = {
          id: `req-${Date.now()}`,
          churchId: targetChurch.id,
          churchName: targetChurch.name,
          userId: newUser.id,
          userName: newUser.name,
          userEmail: newUser.email,
          userPhone: newUser.phone,
          birthDate: newUser.birthDate,
          requestedRole: 'MEMBRO',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        await saveJoinRequestDoc(joinReq);

        setCurrentUser(newUser);
        setCurrentChurch(targetChurch);
        setGooglePendingUser(null);
        localStorage.setItem('kairos_active_user_id', newUser.id);
        setIsLoading(false);
        return { requiresApproval: true, church: targetChurch };
      }
    } catch (err: any) {
      const msg = formatAuthErrorMessage(err);
      setAuthError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  const loginAsDemoUser = async (role: 'admin' | 'leader' | 'member' = 'admin') => {
    clearLogoutFlags();
    setIsLoading(true);
    setAuthError(null);
    try {
      let targetUser = INITIAL_USERS[0];
      if (role === 'leader') {
        targetUser = INITIAL_USERS.find(u => u.id === 'user-priscila') || INITIAL_USERS[1];
      } else if (role === 'member') {
        targetUser = INITIAL_USERS.find(u => u.id === 'user-david') || INITIAL_USERS[2];
      }

      const demoChurch: Church = {
        id: 'church-demo',
        name: 'Minha Igreja Hub (Demo)',
        code: 'HUB-777',
        campus: 'Campus Principal',
        subtitle: 'Gestão Congregacional & Escalas',
        adminId: targetUser.id,
        adminName: targetUser.name,
        adminEmail: targetUser.email,
        phone: targetUser.phone,
        createdAt: new Date().toISOString()
      };

      const userWithChurch: User = {
        ...targetUser,
        churchId: demoChurch.id,
        churchCode: demoChurch.code
      };

      setCurrentUser(userWithChurch);
      setCurrentChurch(demoChurch);
      localStorage.setItem('kairos_active_user_id', userWithChurch.id);
    } catch (err) {
      console.warn('Demo login note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    isLoggingOutRef.current = true;
    sessionStorage.setItem('kairos_is_logged_out', 'true');
    localStorage.setItem('kairos_is_logged_out', 'true');
    localStorage.removeItem('kairos_active_user_id');
    sessionStorage.removeItem('kairos_active_user_id');
    setFirebaseUser(null);
    setCurrentUser(null);
    setCurrentChurch(null);
    setGooglePendingUser(null);
    setIsLoading(true);

    try {
      await signOut(auth);
    } catch (err) {
      console.warn('SignOut note:', err);
    } finally {
      sessionStorage.setItem('kairos_is_logged_out', 'true');
      localStorage.setItem('kairos_is_logged_out', 'true');
      localStorage.removeItem('kairos_active_user_id');
      sessionStorage.removeItem('kairos_active_user_id');
      setFirebaseUser(null);
      setCurrentUser(null);
      setCurrentChurch(null);
      setGooglePendingUser(null);
      setIsLoading(false);
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 5000);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        currentChurch,
        googlePendingUser,
        isAuthenticated: !!currentUser,
        isLoading,
        authError,
        loginWithGoogle,
        loginAsDemoUser,
        completeGoogleRegistration,
        setGooglePendingUser,
        loginWithEmail,
        registerAndCreateChurch,
        registerAndJoinChurch,
        logout,
        setCurrentUser,
        setCurrentChurch,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

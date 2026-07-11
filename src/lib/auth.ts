import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'susi@landlord.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Landlord Hardcoded credentials for Demo/MVP (Admin Access)
        if (credentials.email === 'susi@landlord.com' && credentials.password === 'susi123') {
          return { id: 'admin', name: 'Landlord Admin', email: 'susi@landlord.com', role: 'ADMIN' };
        }

        // Active Tenant Verification
        const tenant = await db.tenant.findUnique({
          where: { email: credentials.email as string },
        });

        if (tenant && tenant.appAccess && tenant.status === 'ACTIVE') {
          // Tenants bypass password for simplicity in this invite-only MVP magic-link simulator
          return { id: tenant.id, name: `${tenant.firstName} ${tenant.lastName}`, email: tenant.email, role: 'TENANT' };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'susi_secret_key_32_characters_long_minimum',
});

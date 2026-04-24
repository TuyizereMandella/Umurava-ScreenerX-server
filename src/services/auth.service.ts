import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

// Define expected request bodies for typing
export interface SignupDTO {
  companyName: string;
  fullName: string;
  email: string;
  passwordHash: string; // the controller will hash the raw password and pass it here
}

export interface LoginDTO {
  email: string;
}

export class AuthService {
  /**
   * Creates a new organization and the initial admin user.
   */
  static async signup(data: SignupDTO) {
    // 1. Create Organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: data.companyName }])
      .select()
      .single();

    if (orgError) {
      throw new AppError(`Failed to create organization: ${orgError.message}`, 500);
    }

    // 2. Create User
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          organization_id: orgData.id,
          full_name: data.fullName,
          email: data.email,
          password_hash: data.passwordHash,
          role: 'ADMIN', // First user is always ADMIN
        },
      ])
      .select('id, organization_id, full_name, email, role') // exclude password_hash
      .single();

    if (userError) {
      // Rollback org creation manually (since we don't have SQL transactions natively in simple supabase RPC without custom functions)
      await supabase.from('organizations').delete().eq('id', orgData.id);
      throw new AppError(`Failed to create user: ${userError.message}`, 500);
    }

    return { user: userData, organization: orgData };
  }

  /**
   * Finds a user by email to verify login credentials.
   */
  static async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new AppError(`Database error during login: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Updates the password hash for a user.
   */
  static async updatePassword(userId: string, newPasswordHash: string) {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (error) {
      throw new AppError(`Failed to update password: ${error.message}`, 500);
    }
  }

  /**
   * Fetches a user by ID.
   */
  static async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new AppError(`Failed to fetch user: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Updates the last_login timestamp for a user.
   */
  static async updateLastLogin(userId: string) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
  }
}

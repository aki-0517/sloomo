import { supabase, TABLES, Database } from '../config/supabase';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

class SupabaseUserService {
  async createUser(userData: UserInsert): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .insert(userData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async getUserByWalletAddress(walletAddress: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting user by wallet address:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserByWalletAddress:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: UserUpdate): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  async updateKycStatus(
    userId: string, 
    status: 'not_started' | 'pending' | 'approved' | 'rejected'
  ): Promise<UserRow | null> {
    return this.updateUser(userId, { kyc_status: status });
  }

  async updatePreferences(
    userId: string, 
    preferences: UserRow['preferences']
  ): Promise<UserRow | null> {
    return this.updateUser(userId, { preferences });
  }

  async setPlaidLinked(userId: string, linked: boolean): Promise<UserRow | null> {
    return this.updateUser(userId, { plaid_linked: linked });
  }

  async completeOnboarding(userId: string): Promise<UserRow | null> {
    return this.updateUser(userId, { is_onboarded: true });
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  // Real-time subscription for user updates
  subscribeToUserUpdates(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.USERS,
          filter: `id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
}

export const supabaseUserService = new SupabaseUserService();
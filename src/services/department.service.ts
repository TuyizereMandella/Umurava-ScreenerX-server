import { supabase } from '../config/supabase';
import { AppError } from '../utils/AppError';

export class DepartmentService {
  /**
   * Retrieves all departments for a specific organization. 
   */
  static async getDepartments(organizationId: string) {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) {
      throw new AppError(`Failed to fetch departments: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Creates a new department for an organization.
   */
  static async createDepartment(organizationId: string, name: string) {
    const { data, error } = await supabase
      .from('departments')
      .insert([
        {
          organization_id: organizationId,
          name,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError('A department with this name already exists', 400);
      }
      throw new AppError(`Failed to create department: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Deletes a department.
   */
  static async deleteDepartment(organizationId: string, deptId: string) {
    const { data, error } = await supabase
      .from('departments')
      .delete()
      .eq('id', deptId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Department not found', 404);
      }
      throw new AppError(`Failed to delete department: ${error.message}`, 500);
    }

    return data;
  }
}

import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import { AppError } from '../utils/AppError';

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const departments = await DepartmentService.getDepartments(organizationId);

    res.status(200).json({
      status: 'success',
      results: departments.length,
      data: {
        departments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return next(new AppError('Department name is required', 400));
    }

    const department = await DepartmentService.createDepartment(organizationId, name.trim());

    res.status(201).json({
      status: 'success',
      data: {
        department,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const id = req.params.id as string;
    await DepartmentService.deleteDepartment(organizationId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

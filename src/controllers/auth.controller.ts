import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AuthService } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyName, fullName, email, password } = req.body;

    if (!companyName || !fullName || !email || !password) {
      return next(new AppError('Please provide all required fields.', 400));
    }

    // Check if user already exists
    const existingUser = await AuthService.getUserByEmail(email);
    if (existingUser) {
      return next(new AppError('Email is already registered.', 409));
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create org and user
    const result = await AuthService.signup({
      companyName,
      fullName,
      email,
      passwordHash,
    });

    // Generate JWT
    const token = signToken({
      userId: result.user.id,
      organizationId: result.user.organization_id,
      role: result.user.role,
    });

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: result.user,
        organization: result.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // 1) Check if user exists
    const user = await AuthService.getUserByEmail(email);
    if (!user) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 2) Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) Update last login
    await AuthService.updateLastLogin(user.id);

    // 4) Generate JWT
    const token = signToken({
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
    });

    // Remove password_hash from response
    user.password_hash = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

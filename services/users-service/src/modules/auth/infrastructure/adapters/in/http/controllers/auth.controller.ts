import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Login } from '../../../../../application/use-cases/login.js';
import { VerifyEmail } from '../../../../../application/use-cases/verify-email.js';
import { RegisterUser } from '../../../../../../users/application/use-cases/register-user.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterUserDto } from '../dto/register-user.dto.js';
import { VerifyEmailDto } from '../dto/verify-email.dto.js';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly verifyEmail: VerifyEmail,
    private readonly login: Login,
  ) {}

  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.registerUser.execute(body);
  }

  @Post('verify-email')
  verify(@Body() body: VerifyEmailDto) {
    return this.verifyEmail.execute(body.token);
  }

  @Get('verify-email')
  verifyLink(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Verification token is required');
    return this.verifyEmail.execute(token);
  }

  @Post('login')
  loginUser(@Body() body: LoginDto) {
    return this.login.execute(body.email, body.password);
  }
}

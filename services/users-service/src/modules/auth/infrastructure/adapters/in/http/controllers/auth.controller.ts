import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Registrar una cuenta',
    description:
      'Crea una cuenta CUSTOMER pendiente de verificación y envía un enlace al correo institucional. La respuesta no incluye el token de verificación.',
  })
  @ApiBody({
    type: RegisterUserDto,
    examples: {
      estudiante: {
        summary: 'Registro de estudiante',
        value: {
          email: 'ana.valencia@correounivalle.edu.co',
          firstName: 'Ana',
          lastName: 'Valencia',
          primaryPhone: '+57 300 1234567',
          marketingConsent: false,
          password: 'Valle2026!',
          vinculationType: 'ESTUDIANTE',
        },
      },
    },
  })
  register(@Body() body: RegisterUserDto) {
    return this.registerUser.execute(body);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verificar el correo electrónico',
    description:
      'Activa la cuenta usando el token recibido en el enlace enviado al correo.',
  })
  @ApiBody({
    type: VerifyEmailDto,
    examples: {
      verificationToken: {
        summary: 'Token recibido por correo',
        value: { token: 'pega-aqui-el-token-del-correo' },
      },
    },
  })
  verify(@Body() body: VerifyEmailDto) {
    return this.verifyEmail.execute(body.token);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verificar el correo desde el enlace',
    description:
      'Alternativa GET para activar la cuenta desde el enlace recibido por correo.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token de verificación recibido por correo.',
    example: 'pega-aqui-el-token-del-correo',
  })
  verifyLink(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Verification token is required');
    return this.verifyEmail.execute(token);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica una cuenta activa y verificada. Devuelve un access token JWT para usar en las rutas protegidas. Límite: 5 intentos por minuto y dirección IP.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      estudiante: {
        summary: 'Credenciales de ejemplo',
        value: {
          email: 'ana.valencia@correounivalle.edu.co',
          password: 'Valle2026!',
        },
      },
    },
  })
  loginUser(@Body() body: LoginDto) {
    return this.login.execute(body.email, body.password);
  }
}

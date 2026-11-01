import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({
    status: 200,
    description: 'The service is healthy.',
    schema: {
      example: { status: 'ok' },
    },
  })
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Body, HttpCode, HttpStatus, } from '@nestjs/common';
import { CheckAvailabilityUseCase } from '../../application/use-cases/check-availability.use-case.js';
import { ReserveStockUseCase } from '../../application/use-cases/reserve-stock.use-case.js';
import { ReleaseStockUseCase } from '../../application/use-cases/release-stock.use-case.js';
import { CommitStockUseCase } from '../../application/use-cases/commit-stock.use-case.js';
import { StockOperationDto } from '../../application/dtos/stock-operations.dto.js';
/**
 * Endpoints INTERNOS de stock.
 * Estos NO deben exponerse a través del API Gateway.
 * Solo deben ser consumidos por orders-service (red interna / docker network).
 */
let StockController = class StockController {
    checkAvailability;
    reserveStock;
    releaseStock;
    commitStock;
    constructor(checkAvailability, reserveStock, releaseStock, commitStock) {
        this.checkAvailability = checkAvailability;
        this.reserveStock = reserveStock;
        this.releaseStock = releaseStock;
        this.commitStock = commitStock;
    }
    async check(dto) {
        return this.checkAvailability.execute(dto.productId, dto.quantity);
    }
    async reserve(dto) {
        await this.reserveStock.execute(dto.productId, dto.quantity);
    }
    async release(dto) {
        await this.releaseStock.execute(dto.productId, dto.quantity);
    }
    async commit(dto) {
        await this.commitStock.execute(dto.productId, dto.quantity);
    }
};
__decorate([
    Post('check-availability'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StockOperationDto]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "check", null);
__decorate([
    Post('reserve'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StockOperationDto]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "reserve", null);
__decorate([
    Post('release'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StockOperationDto]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "release", null);
__decorate([
    Post('commit'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StockOperationDto]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "commit", null);
StockController = __decorate([
    Controller('internal/stock'),
    __metadata("design:paramtypes", [CheckAvailabilityUseCase,
        ReserveStockUseCase,
        ReleaseStockUseCase,
        CommitStockUseCase])
], StockController);
export { StockController };
//# sourceMappingURL=stock.controller.js.map
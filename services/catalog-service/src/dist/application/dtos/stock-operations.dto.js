var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
/**
 * DTO para operaciones de stock:
 * - checkAvailability
 * - reserveStock
 * - releaseStock
 * - commitStock
 */
export class StockOperationDto {
    productId;
    quantity;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], StockOperationDto.prototype, "productId", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(99) // según SDD: máximo por ítem = 99
    ,
    __metadata("design:type", Number)
], StockOperationDto.prototype, "quantity", void 0);
export class CheckAvailabilityDto {
    productId;
    quantity;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CheckAvailabilityDto.prototype, "productId", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(99),
    __metadata("design:type", Number)
], CheckAvailabilityDto.prototype, "quantity", void 0);
//# sourceMappingURL=stock-operations.dto.js.map
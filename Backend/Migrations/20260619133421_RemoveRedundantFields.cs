using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRedundantFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CheckInRecords_PPEDetections_PPEDetectionId",
                table: "CheckInRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_CheckInRecords_ShiftConfigs_ShiftConfigShiftId",
                table: "CheckInRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_PPEDetections_Employees_EmployeeId",
                table: "PPEDetections");

            migrationBuilder.DropForeignKey(
                name: "FK_Violations_CheckInRecords_CheckInId",
                table: "Violations");

            migrationBuilder.DropForeignKey(
                name: "FK_Violations_Employees_EmployeeId",
                table: "Violations");

            migrationBuilder.DropIndex(
                name: "IX_Violations_CheckInId",
                table: "Violations");

            migrationBuilder.DropIndex(
                name: "IX_Violations_EmployeeId_IsResolved",
                table: "Violations");

            migrationBuilder.DropIndex(
                name: "IX_PPEDetections_DetectionTime",
                table: "PPEDetections");

            migrationBuilder.DropIndex(
                name: "IX_PPEDetections_EmployeeId",
                table: "PPEDetections");

            migrationBuilder.DropIndex(
                name: "IX_CheckInRecords_PPEDetectionId",
                table: "CheckInRecords");

            migrationBuilder.DropIndex(
                name: "IX_CheckInRecords_ShiftConfigShiftId",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "CheckInId",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "NotificationSent",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "LastLoginAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DetectionTime",
                table: "PPEDetections");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "PPEDetections");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "PPEDetections");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "TelegramUserId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "LastHeartbeat",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "MacAddress",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "HasPPE",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "IsOfflineSync",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "PPEDetectionId",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "ShiftConfigShiftId",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "ShiftId",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CheckInRecords");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "CheckInRecords");

            migrationBuilder.CreateIndex(
                name: "IX_Violations_IsResolved",
                table: "Violations",
                column: "IsResolved");

            migrationBuilder.CreateIndex(
                name: "IX_PPEDetections_CheckInId",
                table: "PPEDetections",
                column: "CheckInId",
                unique: true,
                filter: "[CheckInId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_PPEDetections_CheckInRecords_CheckInId",
                table: "PPEDetections",
                column: "CheckInId",
                principalTable: "CheckInRecords",
                principalColumn: "CheckInId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PPEDetections_CheckInRecords_CheckInId",
                table: "PPEDetections");

            migrationBuilder.DropIndex(
                name: "IX_Violations_IsResolved",
                table: "Violations");

            migrationBuilder.DropIndex(
                name: "IX_PPEDetections_CheckInId",
                table: "PPEDetections");

            migrationBuilder.AddColumn<int>(
                name: "CheckInId",
                table: "Violations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Violations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "EmployeeId",
                table: "Violations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Violations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotificationSent",
                table: "Violations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Severity",
                table: "Violations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLoginAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DetectionTime",
                table: "PPEDetections",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "EmployeeId",
                table: "PPEDetections",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "PPEDetections",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "Employees",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "Employees",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "TelegramUserId",
                table: "Employees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "Devices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastHeartbeat",
                table: "Devices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MacAddress",
                table: "Devices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Devices",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Devices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasPPE",
                table: "CheckInRecords",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsOfflineSync",
                table: "CheckInRecords",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PPEDetectionId",
                table: "CheckInRecords",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShiftConfigShiftId",
                table: "CheckInRecords",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShiftId",
                table: "CheckInRecords",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "CheckInRecords",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "CheckInRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Violations_CheckInId",
                table: "Violations",
                column: "CheckInId");

            migrationBuilder.CreateIndex(
                name: "IX_Violations_EmployeeId_IsResolved",
                table: "Violations",
                columns: new[] { "EmployeeId", "IsResolved" });

            migrationBuilder.CreateIndex(
                name: "IX_PPEDetections_DetectionTime",
                table: "PPEDetections",
                column: "DetectionTime");

            migrationBuilder.CreateIndex(
                name: "IX_PPEDetections_EmployeeId",
                table: "PPEDetections",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_CheckInRecords_PPEDetectionId",
                table: "CheckInRecords",
                column: "PPEDetectionId",
                unique: true,
                filter: "[PPEDetectionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CheckInRecords_ShiftConfigShiftId",
                table: "CheckInRecords",
                column: "ShiftConfigShiftId");

            migrationBuilder.AddForeignKey(
                name: "FK_CheckInRecords_PPEDetections_PPEDetectionId",
                table: "CheckInRecords",
                column: "PPEDetectionId",
                principalTable: "PPEDetections",
                principalColumn: "PPEDetectionId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CheckInRecords_ShiftConfigs_ShiftConfigShiftId",
                table: "CheckInRecords",
                column: "ShiftConfigShiftId",
                principalTable: "ShiftConfigs",
                principalColumn: "ShiftId");

            migrationBuilder.AddForeignKey(
                name: "FK_PPEDetections_Employees_EmployeeId",
                table: "PPEDetections",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "EmployeeId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Violations_CheckInRecords_CheckInId",
                table: "Violations",
                column: "CheckInId",
                principalTable: "CheckInRecords",
                principalColumn: "CheckInId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Violations_Employees_EmployeeId",
                table: "Violations",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "EmployeeId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class FixViolationAndUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordResetToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordResetTokenExpiry",
                table: "Users");

            migrationBuilder.Sql("DELETE FROM Violations;");

            migrationBuilder.AddColumn<int>(
                name: "EmployeeId",
                table: "Violations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Violations_EmployeeId",
                table: "Violations",
                column: "EmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Violations_Employees_EmployeeId",
                table: "Violations",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "EmployeeId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Violations_Employees_EmployeeId",
                table: "Violations");

            migrationBuilder.DropIndex(
                name: "IX_Violations_EmployeeId",
                table: "Violations");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "Violations");

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetToken",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetTokenExpiry",
                table: "Users",
                type: "datetime2",
                nullable: true);
        }
    }
}

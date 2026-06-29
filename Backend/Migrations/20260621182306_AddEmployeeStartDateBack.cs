using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeStartDateBack : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.AddColumn<DateTime>(
            //     name: "StartDate",
            //     table: "Employees",
            //     type: "datetime2",
            //     nullable: true);

            // migrationBuilder.Sql("""
            //     UPDATE Employees
            //     SET StartDate = CAST(CreatedAt AS date)
            //     WHERE StartDate IS NULL
            //     """);

            // migrationBuilder.AlterColumn<DateTime>(
            //     name: "StartDate",
            //     table: "Employees",
            //     type: "datetime2",
            //     nullable: false,
            //     defaultValueSql: "CAST(GETDATE() AS date)",
            //     oldClrType: typeof(DateTime),
            //     oldType: "datetime2",
            //     oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Employees");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeFaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmployeeFaces",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    FaceImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FaceEmbedding = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeFaces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeFaces_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "EmployeeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO EmployeeFaces (EmployeeId, FaceImageUrl, FaceEmbedding, IsPrimary, CreatedAt)
                SELECT EmployeeId, FaceImageUrl, FaceEmbedding, CAST(1 AS bit), CreatedAt
                FROM Employees
                WHERE FaceImageUrl IS NOT NULL
                  AND FaceImageUrl <> ''
                  AND FaceEmbedding IS NOT NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeFaces_EmployeeId",
                table: "EmployeeFaces",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeFaces");
        }
    }
}

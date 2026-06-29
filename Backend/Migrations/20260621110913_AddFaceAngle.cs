using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class AddFaceAngle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Angle",
                table: "EmployeeFaces",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Angle",
                table: "EmployeeFaces");
        }
    }
}

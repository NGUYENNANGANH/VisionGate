using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionGate.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeFaceCloudinaryPublicId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloudinaryPublicId",
                table: "EmployeeFaces",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloudinaryPublicId",
                table: "EmployeeFaces");
        }
    }
}

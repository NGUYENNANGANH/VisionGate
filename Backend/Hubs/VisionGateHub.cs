using Microsoft.AspNetCore.SignalR;

namespace VisionGate.Hubs;

public class VisionGateHub : Hub
{
    // Client methods - Frontend sẽ lắng nghe các events này

    // 1. Thông báo check-in mới
    public async Task SendNewCheckIn(object checkInData)
    {
        await Clients.All.SendAsync("ReceiveNewCheckIn", checkInData);
    }

    // 2. Thông báo vi phạm mới
    public async Task SendNewViolation(object violationData)
    {
        await Clients.All.SendAsync("ReceiveNewViolation", violationData);
    }

    // 3. Cập nhật thống kê dashboard
    public async Task SendStatsUpdate(object statsData)
    {
        await Clients.All.SendAsync("ReceiveStatsUpdate", statsData);
    }

    // 4. Trạng thái thiết bị
    public async Task SendDeviceStatus(object deviceData)
    {
        await Clients.All.SendAsync("ReceiveDeviceStatus", deviceData);
    }

    // Connection events
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}

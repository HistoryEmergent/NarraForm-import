import { Button } from "@/components/ui/button";
import { geminiRateLimiter } from "@/utils/geminiRateLimiter";
import { toast } from "@/hooks/use-toast";

export const QuotaReset = () => {
  const handleResetQuota = () => {
    const statusBefore = geminiRateLimiter.getRateLimitStatus('gemini-2.5-pro');
    console.log('Status before reset:', statusBefore);
    
    // Check localStorage directly
    const stored = localStorage.getItem('gemini_rate_limiter_requests');
    console.log('LocalStorage before reset:', stored);
    
    geminiRateLimiter.resetDailyQuota('gemini-2.5-pro');
    
    const statusAfter = geminiRateLimiter.getRateLimitStatus('gemini-2.5-pro');
    console.log('Status after reset:', statusAfter);
    
    const storedAfter = localStorage.getItem('gemini_rate_limiter_requests');
    console.log('LocalStorage after reset:', storedAfter);
    
    toast({
      title: "Quota Reset",
      description: `Reset from ${statusBefore.dailyRequests}/${statusBefore.dailyQuota} to ${statusAfter.dailyRequests}/${statusAfter.dailyQuota}`
    });
  };

  const handleManualClear = () => {
    localStorage.removeItem('gemini_rate_limiter_requests');
    console.log('Manually cleared localStorage');
    toast({
      title: "Manual Clear",
      description: "Manually cleared all rate limiter data from localStorage"
    });
  };

  const status = geminiRateLimiter.getRateLimitStatus('gemini-2.5-pro');

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">
        Pro: {status.dailyRequests}/{status.dailyQuota}
      </span>
      <Button 
        onClick={handleResetQuota}
        variant="outline"
        size="sm"
        className="h-6 px-2 text-xs"
      >
        Reset
      </Button>
      <Button 
        onClick={handleManualClear}
        variant="outline"
        size="sm"
        className="h-6 px-2 text-xs"
      >
        Clear All
      </Button>
    </div>
  );
};
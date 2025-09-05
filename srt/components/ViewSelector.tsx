import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewType } from "@/types/viewMode";

interface ViewSelectorProps {
  selectedViews: ViewType[];
  onViewToggle: (view: ViewType) => void;
  storyboardMode?: boolean;
  onStoryboardToggle?: (enabled: boolean) => void;
}

const viewLabels: Record<ViewType, string> = {
  'original': 'Original',
  'script': 'Script', 
  'shot-list': 'Shot List'
};

export const ViewSelector = ({ selectedViews, onViewToggle, storyboardMode, onStoryboardToggle }: ViewSelectorProps) => {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">Views:</span>
      {(Object.keys(viewLabels) as ViewType[]).map((view) => (
        <div key={view} className="flex items-center space-x-2">
          <Checkbox
            id={`view-${view}`}
            checked={selectedViews.includes(view)}
            onCheckedChange={() => onViewToggle(view)}
          />
          <label
            htmlFor={`view-${view}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {viewLabels[view]}
          </label>
        </div>
      ))}
      {selectedViews.includes('shot-list') && onStoryboardToggle && (
        <div className="flex items-center space-x-2 ml-2 pl-2 border-l">
          <Checkbox
            id="storyboard-mode"
            checked={storyboardMode || false}
            onCheckedChange={onStoryboardToggle}
          />
          <label
            htmlFor="storyboard-mode"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Storyboard
          </label>
        </div>
      )}
    </div>
  );
};
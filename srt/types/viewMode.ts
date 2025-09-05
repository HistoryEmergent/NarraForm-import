export type ViewType = 'original' | 'script' | 'shot-list';

export interface ViewState {
  selectedViews: ViewType[];
  storyboardMode?: boolean;
}

// Helper function to determine layout mode
export const getLayoutMode = (selectedViews: ViewType[]): 'single' | 'side-by-side' => {
  return selectedViews.length > 1 ? 'side-by-side' : 'single';
};

// Helper function to sort views in proper order (original always left of script)
export const sortViews = (views: ViewType[]): ViewType[] => {
  const order: ViewType[] = ['original', 'script', 'shot-list'];
  return order.filter(view => views.includes(view));
};
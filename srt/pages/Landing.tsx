import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeftRight, BookOpen, Mic, Globe, Users, Zap, CheckCircle, Languages, ExternalLink, Camera, Film, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
const Landing = () => {
  const navigate = useNavigate();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);
  const features = [{
    icon: <BookOpen className="h-6 w-6" />,
    title: "Stay Organized",
    description: "Automatically organize and process your story by chapter or scene, or in bulk batches.",
    variant: "default"
  }, {
    icon: <Mic className="h-6 w-6" />,
    title: "Audio Drama Conversion",
    description: "Transform any story into properly formatted audio drama scripts with narration, character dialogue, and sound cues.",
    variant: "default"
  }, {
    icon: <Globe className="h-6 w-6" />,
    title: "Any File Type",
    description: "Import docx, HTML, RTF, EPUB, and more. Export your story in the format that works best for your process.",
    variant: "default"
  }, {
    icon: <Users className="h-6 w-6" />,
    title: "Audience Building",
    description: "Make your stories accessible to different audiences through multiple formats, languages, and mediums.",
    variant: "default"
  }, {
    icon: <Zap className="h-6 w-6" />,
    title: "AI-Powered Processing",
    description: "Customizable prompts transforms your story exactly how you choose, leaving dialog unchanged and preserving your intention.",
    variant: "default"
  }, {
    icon: <Languages className="h-6 w-6" />,
    title: "Long-Form Story Translation",
    description: "Translate your novels, series, and long-form stories into multiple languages while preserving narrative flow and cultural nuances.",
    variant: "default"
  }, {
    icon: <Camera className="h-6 w-6" />,
    title: "Shot List Generation",
    description: "Create detailed shot lists with camera angles, movements, and technical specifications directly from your story text.",
    variant: "default"
  }, {
    icon: <Film className="h-6 w-6" />,
    title: "Visual Storyboarding",
    description: "Generate context-aware storyboard images that visualize your scenes with AI-powered image generation.",
    variant: "default"
  }, {
    icon: <Video className="h-6 w-6" />,
    title: "Video Generation (Coming Soon)",
    description: "Transform your storyboards and shot lists into video sequences with AI-powered video generation technology.",
    variant: "coming-soon"
  }];
  const transformations = [{
    from: "Screenplay",
    to: "Novel",
    example: "Transform any novel into a screenplay, or vice versa, in any language"
  }, {
    from: "Novel",
    to: "Audio Drama",
    example: "Transform prose into narration, dialogue, and sound cues"
  }, {
    from: "Story",
    to: "Storyboard",
    example: "Create a shot list simply by highlighting the text, then generate a context aware storyboard"
  }];
  return <div className="min-h-screen film-grain-bg">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">NarraForm</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 pt-40 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-10"></div>
        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-primary mb-8 fade-in-up floating">
            Transform Your Stories
          </h1>
          <p className="text-xl sm:text-2xl text-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed fade-in-up stagger-1 font-mono">
            Any medium. Any language. Then, visualize!<br />
            <span className="text-primary font-semibold">Reach your audience.</span>
          </p>
          <div className="flex justify-center fade-in-up stagger-2">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-xl px-12 py-8 hover-lift shadow-2xl font-semibold tracking-wide">
              begin
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          
        </div>
      </section>

      {/* Transformation Examples */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 section-bg">
        <div className="container mx-auto">
          <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto fade-in-up stagger-1 font-mono">
            Stay true to your words and your world, in any format.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {transformations.map((transformation, index) => <Card key={index} className={`text-center elegant-card fade-in-up stagger-${index + 2}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-center gap-3 text-lg">
                    <span className="font-serif text-muted-foreground">{transformation.from}</span>
                    {transformation.from === "Screenplay" && transformation.to === "Novel" ? <ArrowLeftRight className="h-5 w-5 text-primary icon-glow" /> : <ArrowRight className="h-5 w-5 text-primary icon-glow" />}
                    <span className="font-serif text-primary">{transformation.to}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed font-mono">{transformation.example}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-12 fade-in-up">Tired of the royal runaround?</h2>
          
          <div className="space-y-6 mb-12 text-lg leading-relaxed fade-in-up stagger-1">
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-1 font-mono">
                <p><span className="font-semibold text-primary">Panelist:</span> "Get an agent."</p>
                <p><span className="font-semibold text-primary">Agent:</span> "Find a manager."</p>
                <p><span className="font-semibold text-primary">Manager:</span> "Talk to a lawyer."</p>
                <p><span className="font-semibold text-primary">Lawyer:</span> "Hit the festivals".</p>
                <p><span className="font-semibold text-primary">....Repeat...</span></p>
              </div>
              
              <div className="space-y-6 font-mono">
                <p>The festival circuit is a relic feeding a broken system.<br /> Hollywood is collapsing in real time.</p>
                
                <p className="text-xl font-semibold">The cavalry isn't coming.<br />
                <span className="text-primary">You are the cavalry.</span></p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6 text-lg leading-relaxed fade-in-up stagger-2 font-mono">
            <p className="text-xl"><span className="font-serif font-bold text-primary">NarraForm</span> is for creators that are done waiting.</p>
            <p>No gatekeepers. No permission slips.</p>
            <p>Just a powerful tool to help you turn your story into something the world can actually experience. NarraForm propels you to the first draft in your new medium—fast.
Sidestep the tedium. Skip the formatting hell. Jump straight into the polish and finish up on the platform of your choice.</p>
            <p className="text-xl font-semibold italic">The future will be written for us unless we make history. Carpe diem.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 section-bg">
        <div className="container mx-auto">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-center mb-6 fade-in-up">Powerful Features for Storytellers</h2>
          <p className="text-lg text-muted-foreground text-center mb-16 max-w-3xl mx-auto leading-relaxed fade-in-up stagger-1 font-mono">
            Everything you need to transform your stories and reach new audiences across different mediums and languages.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className={`elegant-card group fade-in-up stagger-${index % 3 + 2} ${feature.variant === 'coming-soon' ? 'border-orange-500/20 bg-orange-50/5' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-lg">
                    <div className={`p-3 rounded-xl transition-colors icon-glow ${feature.variant === 'coming-soon' ? 'text-orange-500 bg-orange-500/10 group-hover:bg-orange-500/20' : 'text-primary bg-primary/10 group-hover:bg-primary/20'}`}>
                      {feature.icon}
                    </div>
                    <span className={`transition-colors ${feature.variant === 'coming-soon' ? 'group-hover:text-orange-500' : 'group-hover:text-primary'}`}>{feature.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-base font-mono">{feature.description}</CardDescription>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>


      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 section-bg">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="fade-in-up">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-8">Build Your Audience Across Multiple Platforms</h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-mono">
                Don't limit your stories to just one format. With NarraForm, you can adapt your stories 
                for different audiences and platforms, maximizing your reach and engagement.
              </p>
              <div className="space-y-6">
                {["Reach audio-first audiences with podcast-ready formats", "Create accessible versions for different reading preferences", "Maintain story quality across all format conversions", "Save hours of manual formatting and conversion work"].map((benefit, index) => <div key={index} className={`flex items-center gap-4 fade-in-up stagger-${index + 1} group`}>
                    <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 group-hover:scale-110 transition-transform icon-glow" />
                    <span className="text-lg group-hover:text-primary transition-colors font-mono">{benefit}</span>
                  </div>)}
              </div>
            </div>
            <div className="relative fade-in-up stagger-4">
              <Card className="elegant-card p-8 floating">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-serif">Example Transformation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-secondary/50 rounded-xl border">
                    <p className="font-semibold mb-2 text-primary">Original Novel Text:</p>
                    <p className="text-sm text-muted-foreground italic leading-relaxed font-mono">
                      "Sarah walked into the dimly lit room, her footsteps echoing against the wooden floor.<br />
                      "Hello?" She whispered. "Is anyone there?"
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-primary icon-glow" />
                  </div>
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <p className="font-semibold mb-2 text-primary">Audio Drama Script:</p>
                    <div className="text-sm space-y-2 leading-relaxed font-mono">
                      <p><strong>Narrator:</strong> Sarah walked into the dimly lit room, her footsteps echoing against the wooden floor.</p>
                      <p><strong>SFX:</strong> Door creaking. Footsteps on wooden floor.</p>
                      <p><strong>SARAH:</strong> (whispered) Hello? Is anyone there?</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-center mb-6 fade-in-up">What Creators Are Saying</h2>
          <p className="text-lg text-muted-foreground text-center mb-16 max-w-3xl mx-auto leading-relaxed fade-in-up stagger-1 font-mono">
            See how writers and creators are using NarraForm to transform their stories and reach new audiences.
          </p>
          <div className="relative max-w-4xl mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {[{
                name: "KW Moser",
                role: "Futurist",
                project: "History Emergent",
                projectUrl: "https://example.com/history-emergent",
                image: "/placeholder.svg",
                review: "NarraForm revolutionized our workflow. We transformed our screenplays into a novel, and the novel into a compelling audio drama in days, not months. The AI preserved our dialog and voice while perfectly formatting for audio production."
              }, {
                name: "Marcus Rodriguez",
                role: "Novelist",
                project: "The Quantum Chronicles",
                projectUrl: "https://example.com/quantum-chronicles",
                image: "/placeholder.svg",
                review: "I used NarraForm to adapt my sci-fi novel into a screenplay. The transformation was incredibly smooth - it maintained the essence of my world-building while restructuring everything for visual storytelling. Amazing tool!"
              }, {
                name: "Emma Thompson",
                role: "Podcast Creator",
                project: "Midnight Stories",
                projectUrl: "https://example.com/midnight-stories",
                image: "/placeholder.svg",
                review: "Converting my short stories into podcast-ready scripts was always tedious until I found NarraForm. Now I can focus on the creative aspects while NarraForm handles the technical formatting. Game changer!"
              }, {
                name: "David Kim",
                role: "Screenwriter",
                project: "Urban Legends Retold",
                projectUrl: "https://example.com/urban-legends",
                image: "/placeholder.svg",
                review: "NarraForm helped me translate my screenplay into multiple formats for different markets. The consistency across formats is remarkable - each version feels native to its medium."
              }, {
                name: "Lisa Wang",
                role: "Author",
                project: "Tales from Tomorrow",
                projectUrl: "https://example.com/tales-tomorrow",
                image: "/placeholder.svg",
                review: "As someone who writes in multiple languages, NarraForm's translation capabilities while preserving narrative flow are exceptional. My stories now reach audiences I never thought possible."
              }, {
                name: "Alex Johnson",
                role: "Creative Director",
                project: "Dystopian Dreams",
                projectUrl: "https://example.com/dystopian-dreams",
                image: "/placeholder.svg",
                review: "We use NarraForm for our entire creative pipeline - from initial novel concepts to final audio drama scripts. It's become an indispensable part of our production process."
              }].map((review, index) => <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                      <Card className="elegant-card h-full flex flex-col min-h-[280px]">
                        <CardHeader className="pb-4 flex-shrink-0">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                              <img src={review.image} alt={`${review.name} profile`} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base">{review.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{review.role}</p>
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary font-semibold hover:underline" onClick={() => window.open(review.projectUrl, '_blank')}>
                                {review.project}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-start">
                          <blockquote className="text-sm leading-relaxed text-muted-foreground italic font-mono">
                            "{review.review}"
                          </blockquote>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>)}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-5"></div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-8 text-primary fade-in-up">Ready to Transform Your Stories?</h2>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto fade-in-up stagger-1 font-mono">
            Join writers already using NarraForm to reach new audiences 
            and build their following across multiple platforms.
          </p>
          <div className="fade-in-up stagger-2">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-xl px-12 py-8 hover-lift shadow-2xl font-semibold tracking-wide">
              Get Started for Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <p className="text-lg text-muted-foreground font-light">
            © 2025 <span className="font-serif font-semibold text-primary">NarraForm</span>, a product of <a href="https://www.historyemergent.com" target="_blank" rel="noopener noreferrer" className="font-serif font-semibold text-primary hover:underline">History Emergent</a>
          </p>
        </div>
      </footer>
    </div>;
};
export default Landing;
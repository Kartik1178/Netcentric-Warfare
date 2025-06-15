import { Shield, Rocket, Crosshair, Radar, Zap, BarChart3 } from "lucide-react";
import { Button } from "./components/ui/temp";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      
      {/* Header */}
      <header className="w-full py-6 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold">DefenseSimX</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/fake" className="text-slate-300 hover:text-white transition-colors">Features</Link>
          <Link to="/fake" className="text-slate-300 hover:text-white transition-colors">How It Works</Link>
          <Link to="/fake" className="text-slate-300 hover:text-white transition-colors">Scenarios</Link>
        </nav>
        <Button variant="outline" className="hidden md:flex border-blue-500 text-blue-400 hover:bg-blue-900/20">
          Login
        </Button>
      </header>

      {/* Hero Section */}
      <section className="w-full px-4 py-20 md:py-32 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Advanced Military <span className="text-blue-400">Defense Simulator</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-lg">
            Simulate complex defense scenarios with interactive weapon deployment and threat response systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors">
              Launch Simulator
            </Button>
            <Button
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors"
            >
              Watch Demo
            </Button>
          </div>
        </div>
        <div className="md:w-1/2 relative">
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-2 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="text-xs text-slate-400 ml-2">Defense Simulator v1.0</div>
            </div>
            <img src="/placeholder.svg?height=600&width=800" alt="Defense Simulator Interface" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-800/50 py-20 px-4 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Advanced Simulation Features</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Our defense simulator provides cutting-edge tools for realistic threat response planning and weapon deployment strategies.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard icon={<Rocket className="h-8 w-8 text-blue-400" />} title="Interactive Weapon Deployment" description="Drag and drop defense systems onto tactical maps with precise positioning and rotation controls." />
          <FeatureCard icon={<Crosshair className="h-8 w-8 text-blue-400" />} title="Multiple Threat Scenarios" description="Simulate responses to aerial, naval, missile, and ground-based threats with realistic parameters." />
          <FeatureCard icon={<Radar className="h-8 w-8 text-blue-400" />} title="Real-time Detection Systems" description="Advanced radar and sensor simulations provide early warning and threat tracking capabilities." />
          <FeatureCard icon={<Shield className="h-8 w-8 text-blue-400" />} title="Defense Effectiveness Analysis" description="Comprehensive analytics on defense system performance and threat mitigation capabilities." />
          <FeatureCard icon={<Zap className="h-8 w-8 text-blue-400" />} title="Communication Networks" description="Simulated secure communications between defense units with multiple command channels." />
          <FeatureCard icon={<BarChart3 className="h-8 w-8 text-blue-400" />} title="Strategic Response Planning" description="Develop and test defense strategies against various threat vectors and scenarios." />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">Our intuitive interface makes complex defense simulation accessible and engaging.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <StepCard number="01" title="Select Threat Scenario" description="Choose from multiple threat types including aerial, missile, naval, and ground forces." />
          <StepCard number="02" title="Deploy Defense Systems" description="Drag and drop weapons onto the tactical map to create your defense strategy." />
          <StepCard number="03" title="Analyze Response Effectiveness" description="Review detailed analytics on your defense system's performance against the selected threat." />
        </div>
        <div className="mt-16 text-center">
          <Button className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors">Try It Now</Button>
        </div>
      </section>

      {/* Scenarios Section */}
      <section id="scenarios" className="bg-slate-800/50 py-20 px-4 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Available Scenarios</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">Test your defense strategies against a variety of realistic threat scenarios.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScenarioCard title="Aerial Threats" description="Defend against bomber and fighter aircraft incursions with air defense systems." image="/placeholder.svg?height=200&width=300" color="from-blue-900/50 to-blue-700/50" />
          <ScenarioCard title="Missile Defense" description="Counter ballistic and cruise missile attacks with multi-layered interception systems." image="/placeholder.svg?height=200&width=300" color="from-red-900/50 to-red-700/50" />
          <ScenarioCard title="Naval Incursions" description="Protect coastlines from surface vessels and submarine threats." image="/placeholder.svg?height=200&width=300" color="from-cyan-900/50 to-cyan-700/50" />
          <ScenarioCard title="Ground Forces" description="Defend against infantry and armored vehicle advances with strategic deployments." image="/placeholder.svg?height=200&width=300" color="from-green-900/50 to-green-700/50" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 w-full">
        <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Simulating?</h2>
              <p className="text-slate-300 max-w-xl">
                Launch the simulator now and experience the most advanced defense planning tool available.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors"
              >
                Launch Simulator
              </Button>


              <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-slate-800 px-4 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-6 md:mb-0">
            <Shield className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold">DefenseSimX</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link href="#" className="text-slate-400 hover:text-white transition-colors">Features</Link>
            <Link href="#" className="text-slate-400 hover:text-white transition-colors">How It Works</Link>
            <Link href="#" className="text-slate-400 hover:text-white transition-colors">Scenarios</Link>
            <Link href="#" className="text-slate-400 hover:text-white transition-colors">Support</Link>
            <Link href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} DefenseSimX. All rights reserved. For educational purposes only.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors group">
      <div className="bg-slate-900 rounded-lg w-16 h-16 flex items-center justify-center mb-4 group-hover:bg-blue-900/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="relative">
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <div className="text-5xl font-bold text-blue-500/30 mb-4">{number}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
      <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-500/30"></div>
    </div>
  );
}

function ScenarioCard({ title, description, image, color }) {
  return (
    <div className="group relative overflow-hidden rounded-xl">
      <div className={`absolute inset-0 bg-gradient-to-t ${color} opacity-90 group-hover:opacity-100 transition-opacity`}>
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]"></div>
      </div>
      <img src={image || "/placeholder.svg"} alt={title} className="w-full h-48 object-cover" />
      <div className="relative p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-200 text-sm">{description}</p>
        <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10 group-hover:border-white/40 transition-colors">
          Explore
        </Button>
      </div>
    </div>
  );
}

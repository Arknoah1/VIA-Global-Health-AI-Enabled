import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  ArrowRight, Building2, Heart, HandshakeIcon, Globe, Zap, Users, Award, 
  ShieldCheck, Clock, TrendingUp, Quote, CheckCircle2, MapPin, Package,
  MessageSquare
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"distributors" | "providers" | "ngos">("distributors");

  const audienceData = {
    distributors: {
      title: "Distributors",
      icon: Building2,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      description: "Your client needs a specific product. We'll actually respond.",
      pricing: "Volume-based pricing with distributor margins",
      features: [
        "Quote response within 24 hours—not weeks of silence",
        "Access products manufacturers won't sell you directly",
        "Reliable supply chain with flexible shipping options",
        "One point of contact instead of chasing multiple suppliers"
      ],
      cta: "Get Distributor Quote"
    },
    providers: {
      title: "Healthcare Providers",
      icon: Heart,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      description: "Get the equipment your facility needs without the runaround",
      pricing: "Competitive pricing for healthcare facilities",
      features: [
        "CE, FDA, and ISO certified medical devices",
        "Technical support and product training included",
        "Responsive team that answers your questions",
        "Skip the manufacturer gatekeeping"
      ],
      cta: "Request Facility Quote"
    },
    ngos: {
      title: "NGOs & Faith-based Organizations",
      icon: HandshakeIcon,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      description: "Your grant is approved. Now get the equipment before it expires.",
      pricing: "NGO pricing at manufacturer-direct rates",
      features: [
        "Fast quotes so you can finalize procurement on deadline",
        "Products designed for low-resource settings",
        "Documentation support for grant reporting",
        "We understand your funding timelines"
      ],
      cta: "NGO Partnership Quote"
    }
  };

  const heroProducts = [
    {
      name: "NASG (Non-pneumatic Anti-Shock Garment)",
      description: "Life-saving device for treating obstetric hemorrhage and hypovolemic shock",
      category: "Maternal Health",
      image: "https://viaglobalhealth.com/wp-content/uploads/2020/02/DSC_0369-600x518.jpg",
      searchQuery: "NASG"
    },
    {
      name: "Thermocoagulator",
      description: "Portable device for cervical cancer treatment using thermal ablation",
      category: "Oncology",
      image: "https://viaglobalhealth.com/wp-content/uploads/2022/06/MicrosoftTeams-image-1-600x600.png",
      searchQuery: "Thermocoagulator"
    },
    {
      name: "MTTS Beluga CPAP",
      description: "Affordable CPAP system designed for low-resource settings",
      category: "Neonatal Care",
      image: "https://viaglobalhealth.com/wp-content/uploads/2020/02/beluga-01-580x470-1.jpg",
      searchQuery: "MTTS Beluga"
    }
  ];

  const testimonials = [
    {
      quote: "We had grant funding expiring in 60 days and couldn't get a single manufacturer to respond. VIA quoted us within 24 hours and delivered before our deadline.",
      author: "Dr. Sarah Okonkwo",
      role: "Regional Director",
      org: "Healthcare NGO, Kenya"
    },
    {
      quote: "Our clients kept requesting specific equipment that manufacturers wouldn't sell to us directly. VIA became our solution—they actually respond and follow through.",
      author: "James Mwangi",
      role: "Procurement Manager",
      org: "Medical Distributor, Tanzania"
    },
    {
      quote: "After weeks of silence from the manufacturer, I contacted VIA. They responded the same day and helped us source the exact equipment we needed.",
      author: "Dr. Amara Diallo",
      role: "Health Program Director",
      org: "Faith-based Organization, Senegal"
    }
  ];

  const stats = [
    { value: "15+", label: "Years Experience", icon: Clock },
    { value: "90+", label: "Countries Served", icon: Globe },
    { value: "8M+", label: "Patient Lives Touched", icon: Heart },
    { value: "24hr", label: "Quote Response", icon: Zap }
  ];

  const current = audienceData[activeTab];
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />

      {/* Hero Section - Responsiveness Focused */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            You Need Specific Equipment.<br />
            <span className="text-primary">We Actually Respond.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            From a single unit to a national tender, every inquiry gets the same attention. Quote response within 24 hours—no runaround, no silence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6" data-testid="button-view-products">
                View Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/catalog">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6" data-testid="button-get-quote">
                <MessageSquare className="mr-2 h-5 w-5" />
                Get a Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl md:text-4xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero Products Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Hard-to-Find Equipment, Easy to Quote</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Specialized medical equipment that manufacturers won't quote you directly—but we will
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {heroProducts.map((product, idx) => (
            <Link key={idx} href={`/catalog?search=${encodeURIComponent(product.searchQuery)}&autoOpen=true`}>
              <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/30" data-testid={`card-hero-product-${idx}`}>
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader>
                  <div className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">
                    {product.category}
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary text-sm font-medium">
                    Request Quote <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Customer Segmentation */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Skip the Manufacturer Runaround</h2>
            <p className="text-slate-600">Whether you're a distributor, healthcare provider, or NGO—we respond to every inquiry</p>
          </div>

          {/* Audience Tabs */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(Object.entries(audienceData) as Array<[keyof typeof audienceData, typeof audienceData.distributors]>).map(([key, data]) => {
              const Icon = data.icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? data.color + " border-current shadow-lg"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  data-testid={`button-audience-${key}`}
                >
                  <Icon className={`h-8 w-8 mb-3 ${isActive ? data.textColor : "text-slate-400"}`} />
                  <h4 className="text-lg font-semibold text-slate-900">{data.title}</h4>
                  <p className="text-sm text-slate-600 mt-2">{data.description}</p>
                </button>
              );
            })}
          </div>

          {/* Active Audience Details */}
          <Card className={`${current.color} border-2`}>
            <CardContent className="p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <CurrentIcon className={`h-8 w-8 ${current.textColor}`} />
                    <h3 className="text-2xl font-bold text-slate-900">{current.title}</h3>
                  </div>
                  
                  <div className="bg-white/70 rounded-lg p-4 mb-6 border">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      {current.pricing}
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 mb-4">What We Offer</h4>
                  <ul className="space-y-3 mb-8">
                    {current.features.map((feature, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700">
                        <CheckCircle2 className={`h-5 w-5 ${current.textColor} flex-shrink-0 mt-0.5`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/catalog">
                    <Button size="lg" className="w-full sm:w-auto" data-testid={`button-cta-${activeTab}`}>
                      {current.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="bg-white/50 rounded-xl p-6 border">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Quick Quote Process</h4>
                  <div className="space-y-4">
                    {[
                      { step: "1", title: "Select Products", desc: "Browse our catalog and choose what you need" },
                      { step: "2", title: "Share Requirements", desc: "Tell us quantity, destination, and timeline" },
                      { step: "3", title: "Get Custom Quote", desc: "Receive personalized pricing within 24 hours" },
                      { step: "4", title: "Confirm & Ship", desc: "Finalize order and choose shipping method" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className={`h-8 w-8 rounded-full ${current.color} ${current.textColor} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                          {item.step}
                        </div>
                        <div>
                          <h5 className="font-medium text-slate-900">{item.title}</h5>
                          <p className="text-sm text-slate-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Trusted by Healthcare Leaders</h2>
          <p className="text-slate-600">See what our partners say about working with VIA Global Health</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="h-full" data-testid={`card-testimonial-${idx}`}>
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                  <p className="text-sm text-primary">{testimonial.org}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Trust VIA */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why Choose VIA Global Health?</h2>
            <p className="text-slate-600">Built on relationships, delivered with trust</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, title: "Trusted Relationships", desc: "15+ years building partnerships across Africa" },
              { icon: Zap, title: "Fast Quotes", desc: "Personalized quotes within 24 hours" },
              { icon: Award, title: "Quality Assured", desc: "All products meet international standards" },
              { icon: MapPin, title: "Africa Expertise", desc: "Deep understanding of regional needs" }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="text-center">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of healthcare organizations across Africa who trust VIA Global Health for their medical equipment needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-browse-catalog">
                Browse Catalog
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 text-lg px-8" data-testid="button-learn-more">
                Learn About Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

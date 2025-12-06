import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Building2, Heart, HandshakeIcon, Globe, Zap, Users, Award } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"distributors" | "providers" | "ngos">("distributors");

  const audienceData = {
    distributors: {
      title: "Local Distributors",
      icon: Building2,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      description: "Scale your distribution business with quality medical products",
      features: [
        "Competitive wholesale pricing and bulk discounts",
        "Territory partnerships and exclusive distribution rights",
        "Marketing support and training programs",
        "Reliable supply chain and fast delivery",
        "Order management platform and inventory tracking"
      ],
      products: [
        "Pharmaceuticals & Vaccines",
        "Medical Devices & Equipment",
        "Infection Prevention Supplies",
        "Diagnostic Equipment"
      ],
      cta: "View Wholesale Catalog"
    },
    providers: {
      title: "Healthcare Providers",
      icon: Heart,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      description: "Equip your facility with trusted medical solutions",
      features: [
        "Wide range of FDA-approved medical devices",
        "Quality pharmaceuticals from verified manufacturers",
        "Technical support and installation services",
        "Training programs for staff",
        "Flexible payment terms and financing options"
      ],
      products: [
        "Maternal & Child Health Equipment",
        "Respiratory & Intensive Care",
        "Diagnostic & Laboratory Equipment",
        "Training & Education Resources"
      ],
      cta: "Explore Medical Catalog"
    },
    ngos: {
      title: "NGOs & Non-Profits",
      icon: HandshakeIcon,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      description: "Access affordable healthcare solutions for underserved communities",
      features: [
        "Special NGO pricing and donation programs",
        "Humanitarian project support",
        "Free training and technical workshops",
        "Impact reporting and documentation support",
        "Dedicated account management"
      ],
      products: [
        "Community Health Supplies",
        "Emergency Response Kits",
        "Capacity Building Equipment",
        "Basic Medical Supplies"
      ],
      cta: "NGO Partnership Program"
    }
  };

  const current = audienceData[activeTab];
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Quality Medical Solutions for Global Health
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            VIA Global Health provides trusted pharmaceuticals, medical devices, and equipment to distributors, healthcare providers, and humanitarian organizations across Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" className="w-full sm:w-auto">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Audience Selection */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-slate-900 mb-2">Who Are We?</h3>
          <p className="text-slate-600">Choose your role to see tailored solutions</p>
        </div>

        {/* Audience Tabs */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {(Object.entries(audienceData) as Array<[keyof typeof audienceData, typeof audienceData.distributors]>).map(([key, data]) => {
            const Icon = data.icon;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? data.color + " border-current"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <Icon className={`h-8 w-8 mb-3 ${isActive ? data.textColor : "text-slate-400"}`} />
                <h4 className="text-lg font-semibold text-slate-900">{data.title}</h4>
                <p className="text-sm text-slate-600 mt-2">{data.description}</p>
              </button>
            );
          })}
        </div>

        {/* Active Audience Details */}
        <div className={`rounded-xl ${current.color} border-2 p-8 md:p-12`}>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <CurrentIcon className={`h-8 w-8 ${current.textColor}`} />
                <h3 className="text-2xl font-bold text-slate-900">{current.title}</h3>
              </div>
              <p className="text-slate-700 mb-6">{current.description}</p>

              <h4 className="text-lg font-semibold text-slate-900 mb-4">Why Choose VIA?</h4>
              <ul className="space-y-3 mb-8">
                {current.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-700">
                    <Zap className={`h-5 w-5 ${current.textColor} flex-shrink-0 mt-0.5`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/catalog">
                <Button size="lg" className="w-full sm:w-auto">
                  {current.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Popular Categories</h4>
              <div className="grid gap-3">
                {current.products.map((product, idx) => (
                  <Link href={`/catalog?category=${encodeURIComponent(product)}`} key={idx}>
                    <button className="w-full text-left p-4 bg-white rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="font-medium text-slate-900">{product}</div>
                      <div className="text-sm text-slate-600">View products →</div>
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-slate-900 mb-2">Why Trust VIA Global Health?</h3>
          <p className="text-slate-600">Industry-leading standards and commitment to global health</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Award, label: "FDA Approved", desc: "All products meet international standards" },
            { icon: Users, label: "Expert Support", desc: "24/7 technical and sales support" },
            { icon: Globe, label: "Global Reach", desc: "Serving 40+ countries across Africa" },
            { icon: Zap, label: "Fast Delivery", desc: "Quick shipping and reliable logistics" }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="text-center p-6 rounded-lg bg-slate-50 border border-slate-200">
                <Icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">{item.label}</h4>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Categories */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-slate-900 mb-8 text-center">Featured Categories</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Pharmaceuticals",
              description: "Quality medications and vaccines for all treatment needs",
              count: "500+ products"
            },
            {
              name: "Medical Equipment",
              description: "Advanced diagnostic and monitoring devices",
              count: "200+ products"
            },
            {
              name: "Infection Prevention",
              description: "PPE and safety supplies for health workers",
              count: "150+ products"
            }
          ].map((cat, idx) => (
            <Link key={idx} href={`/catalog?category=${encodeURIComponent(cat.name)}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <CardDescription>{cat.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{cat.count}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of healthcare professionals and organizations trusting VIA Global Health for their medical supply needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary">
                Browse Catalog
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-blue-700 text-white border-blue-500 hover:bg-blue-800">
              Request Quote
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

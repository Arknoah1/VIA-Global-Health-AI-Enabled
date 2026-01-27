import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Globe, Package, Zap, Users, Award, Heart, TrendingUp } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">The Medical Equipment Partner That Actually Responds</h1>
            <p className="text-xl text-blue-100 mb-8">
              Manufacturers often ignore small orders from NGOs and distributors. VIA bridges that gap—aggregating demand so you get the quotes and equipment you need, when you need it.
            </p>
            <Link href="/catalog">
              <Button size="lg" variant="secondary">
                Get a Quote Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About VIA Section */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-about-via">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8" data-testid="heading-about-via">About VIA Global Health</h2>
            
            <div className="space-y-6 text-slate-700 mb-8">
              <p className="text-lg">
                VIA was founded in 2015 as a sustainable business serving global communities through better information, access, and delivery of life-saving medical equipment and supplies. Our growing global network of customers represent or serve public, private, non-government, and faith-based organizations, and we've distributed vital medical technologies to underserved communities in 90 countries.
              </p>
              <p className="text-lg font-semibold text-blue-600">
                To date, VIA has positively impacted the lives of nearly eight million people by creating and scaling universal access to globally dispersed suppliers of essential medical devices and equipment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Buyers Section */}
      <section className="py-16 md:py-24" data-testid="section-for-buyers">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Buyers Choose VIA</h2>
              <p className="text-lg text-slate-700 mb-6">
                Whether you need a single unit or you're fulfilling a national tender, every inquiry gets the same attention. We treat all orders equally because we know your timeline matters regardless of size.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "24-hour quote response—from single units to large tenders",
                  "Same attention for every order, every time",
                  "Products designed for low-resource settings",
                  "Training and technical support included",
                  "One reliable partner instead of chasing suppliers"
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/catalog">
                <Button>Browse Products</Button>
              </Link>
            </div>
            <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
              <Users className="h-16 w-16 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Every Order Gets Equal Attention</h3>
              <p className="text-slate-700">
                From a single unit to a national tender, you'll get a quote response within 24 hours. No order is too small. No order is too large.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Sellers Section */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-for-sellers">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-green-50 rounded-lg p-8 border border-green-200 md:order-2">
              <Package className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Become a Verified Seller</h3>
              <p className="text-slate-700">
                Expand your sales reach to over 85 countries. Our team provides expert design support and marketing strategy for your product launch.
              </p>
            </div>
            <div className="md:order-1">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">For Sellers</h2>
              <p className="text-lg text-slate-700 mb-6">
                VIA facilitates the sale and delivery of your products through our global network of Buyers in over 85 countries. When you join our marketplace, you will receive expert design support to showcase your product in our online catalog. Become a VIA Verified Seller to access a unique sales and marketing strategy for the launch of your product on the VIA Global Health marketplace.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Access global buyer network",
                  "Expert catalog design support",
                  "Marketing strategy assistance",
                  "Verified seller status",
                  "Secure payment processing"
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline">Sell on VIA</Button>
            </div>
          </div>
        </div>
      </section>

      {/* How VIA Works */}
      <section className="py-16 md:py-24" data-testid="section-how-it-works">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center">How VIA Works</h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Every order—from a single unit to a national tender—gets the same dedicated attention and 24-hour response time.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "90+ Countries Served",
                description: "We have successfully delivered medical equipment and pharmaceuticals to over 90 countries across Africa and beyond."
              },
              {
                icon: Package,
                title: "You Get Equipment, Not Silence",
                description: "Submit a quote request and get a response within 24 hours. We handle manufacturer relationships so you don't have to chase multiple contacts."
              },
              {
                icon: Zap,
                title: "Deliver Before Your Deadline",
                description: "Grant funding doesn't wait. We understand your timelines and work to get equipment delivered before your procurement window closes."
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow" data-testid={`card-via-process-${idx + 1}`}>
                  <CardHeader>
                    <Icon className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-16 md:py-24 bg-slate-50" data-testid="section-additional-services">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Product Training, Rewards & More</h2>
            <p className="text-lg text-slate-700 mb-8">
              Take advantage of readily available product training and buyer's guides and earn loyalty rewards points through the VIA Rewards Program. Select distributors can work with our team to improve local presence and sales efforts with a customized distributor website.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Award, title: "Training Programs", desc: "Comprehensive product training and buyer's guides" },
                { icon: TrendingUp, title: "Rewards Program", desc: "Earn loyalty points with every purchase" },
                { icon: Globe, title: "Custom Websites", desc: "Distributor websites tailored to your market" },
                { icon: Heart, title: "Dedicated Support", desc: "24/7 global and local sales team assistance" }
              ].map((service, idx) => {
                const Icon = service.icon;
                return (
                  <div key={idx} className="bg-white p-6 rounded-lg border border-slate-200">
                    <Icon className="h-8 w-8 text-blue-600 mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-2">{service.title}</h3>
                    <p className="text-slate-600 text-sm">{service.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 md:py-24 bg-blue-50" data-testid="section-testimonial">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-2xl">★</span>
              ))}
            </div>
            <blockquote className="text-2xl font-semibold text-slate-900 mb-6 italic">
              "Working with VIA Global health has been the most satisfying experience business wise in my many years of working with international medical companies. From the impeccable communication of the international sales team through Mr. Reza Garda, to the product delivery and packaging."
            </blockquote>
            <p className="text-lg text-slate-700 font-semibold">VIA Verified Buyer, Gambia</p>
            <Link href="/catalog" className="mt-8 inline-block">
              <Button variant="outline">
                Read Customer Testimonials
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white" data-testid="section-final-cta">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Medical supply buyers deserve a frictionless experience. Browse our product catalog and request a quote customized to your location, budget and timeline.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" variant="secondary">
                Browse Products
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-slate-900">
              Become a Verified Buyer
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, User, Mail, MapPin, Loader2 } from "lucide-react";
import { countries } from "@/lib/countries";
import { motion } from "framer-motion";

interface ChatContactFormProps {
  onSubmit: (data: {
    fullName: string;
    email: string;
    country: string;
    firstName: string;
    lastName: string;
    organizationType: string;
  }) => void;
  isLoading?: boolean;
  organizationType: string;
  defaultValues?: {
    fullName?: string;
    email?: string;
    country?: string;
  };
}

const priorityCountries = [
  "Kenya", "Nigeria", "Ghana", "Tanzania", "Uganda", "Ethiopia", "Rwanda",
  "Mozambique", "South Africa", "Senegal", "Cameroon", "Congo (DRC)",
  "Zambia", "Zimbabwe", "Malawi", "Mali", "Burkina Faso", "Niger",
  "Sierra Leone", "Liberia", "Angola", "Benin", "Togo", "Ivory Coast",
  "Madagascar", "Sudan", "Somalia",
  "Mexico", "Colombia", "Peru", "Guatemala", "Honduras", "Ecuador",
  "Bolivia", "Dominican Republic", "Paraguay", "Chile", "Brazil",
  "Argentina", "El Salvador", "Costa Rica", "Panama", "Haiti", "Jamaica",
  "Trinidad and Tobago", "Nicaragua"
];

export function ChatContactForm({ onSubmit, isLoading, organizationType, defaultValues }: ChatContactFormProps) {
  const [fullName, setFullName] = useState(defaultValues?.fullName || "");
  const [email, setEmail] = useState(defaultValues?.email || "");
  const [country, setCountry] = useState(defaultValues?.country || "");
  const [countrySearch, setCountrySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (defaultValues?.country || country) return;
    setGeoLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const countryName = data?.address?.country;
            if (countryName) {
              const match = countries.find(
                (c) => c.name.toLowerCase() === countryName.toLowerCase()
              );
              if (match) setCountry(match.name);
            }
          } catch {
          } finally {
            setGeoLoading(false);
          }
        },
        () => setGeoLoading(false),
        { timeout: 5000 }
      );
    } else {
      setGeoLoading(false);
    }
  }, []);

  const filteredCountries = countrySearch.trim()
    ? countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : [
        ...priorityCountries
          .map(name => countries.find(c => c.name === name))
          .filter(Boolean) as typeof countries[number][],
        { name: "---", code: "divider" },
        ...countries.filter(c => !priorityCountries.includes(c.name))
      ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      newErrors.fullName = "Please enter your full name";
    } else if (!trimmedName.includes(" ")) {
      newErrors.fullName = "Please enter both first and last name";
    }
    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!country) {
      newErrors.country = "Please select your shipping country";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitted) return;
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    setSubmitted(true);
    onSubmit({ fullName: fullName.trim(), email: email.trim(), country, firstName, lastName, organizationType });
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-primary"
        data-testid="contact-form-submitted"
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">{fullName} | {organizationType} | {country}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
      data-testid="contact-form-inline"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="chat-fullname" className="text-sm flex items-center gap-1.5 mb-1.5 font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
          </Label>
          <Input
            id="chat-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="h-12 text-base"
            data-testid="input-contact-fullname"
            autoComplete="name"
          />
          {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <Label htmlFor="chat-email" className="text-sm flex items-center gap-1.5 mb-1.5 font-medium">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
          </Label>
          <Input
            id="chat-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. jane@clinic.com"
            className="h-12 text-base"
            data-testid="input-contact-email"
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        <div className="relative">
          <Label htmlFor="chat-country" className="text-sm flex items-center gap-1.5 mb-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Shipping Country
            {geoLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
          </Label>
          <div className="relative">
            <Input
              id="chat-country"
              value={country || countrySearch}
              onChange={(e) => {
                setCountry("");
                setCountrySearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or select country..."
              className="h-12 text-base"
              data-testid="input-contact-country"
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-44 overflow-y-auto">
                {filteredCountries.map((c, idx) => {
                  if (c.code === "divider") {
                    return <div key={`divider-${idx}`} className="border-t my-1" />;
                  }
                  return (
                    <button
                      key={c.code}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setCountry(c.name);
                        setCountrySearch("");
                        setShowDropdown(false);
                      }}
                      data-testid={`country-option-${c.code}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {filteredCountries.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No countries found</p>
                )}
              </div>
            )}
          </div>
          {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold mt-2"
          data-testid="button-submit-contact-form"
        >
          <Send className="h-4 w-4 mr-2" />
          Get My Quote →
        </Button>
      </form>
    </motion.div>
  );
}

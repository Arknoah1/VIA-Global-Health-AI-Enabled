import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, User, Mail, MapPin } from "lucide-react";
import { countries } from "@/lib/countries";
import { motion } from "framer-motion";

interface ChatContactFormProps {
  onSubmit: (data: {
    fullName: string;
    email: string;
    country: string;
    firstName: string;
    lastName: string;
  }) => void;
  isLoading?: boolean;
  defaultValues?: {
    fullName?: string;
    email?: string;
    country?: string;
  };
}

const africanCountries = [
  "Kenya", "Nigeria", "Ghana", "Tanzania", "Uganda", "Ethiopia", "Rwanda",
  "Mozambique", "South Africa", "Senegal", "Cameroon", "Congo (DRC)",
  "Zambia", "Zimbabwe", "Malawi", "Mali", "Burkina Faso", "Niger",
  "Sierra Leone", "Liberia", "Angola", "Benin", "Togo", "Ivory Coast",
  "Madagascar", "Sudan", "Somalia"
];

export function ChatContactForm({ onSubmit, isLoading, defaultValues }: ChatContactFormProps) {
  const [fullName, setFullName] = useState(defaultValues?.fullName || "");
  const [email, setEmail] = useState(defaultValues?.email || "");
  const [country, setCountry] = useState(defaultValues?.country || "");
  const [countrySearch, setCountrySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCountries = countrySearch.trim()
    ? countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : [
        ...africanCountries
          .map(name => countries.find(c => c.name === name))
          .filter(Boolean) as typeof countries[number][],
        { name: "---", code: "divider" },
        ...countries.filter(c => !africanCountries.includes(c.name))
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
      newErrors.country = "Please select your country";
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
    onSubmit({ fullName: fullName.trim(), email: email.trim(), country, firstName, lastName });
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
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">{fullName} | {email} | {country}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-4 shadow-sm max-w-[90%]"
      data-testid="contact-form-inline"
    >
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Your Details</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="chat-fullname" className="text-xs flex items-center gap-1.5 mb-1">
            <User className="h-3 w-3" /> Full Name
          </Label>
          <Input
            id="chat-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="h-9 text-sm"
            data-testid="input-contact-fullname"
          />
          {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
        </div>
        <div>
          <Label htmlFor="chat-email" className="text-xs flex items-center gap-1.5 mb-1">
            <Mail className="h-3 w-3" /> Email Address
          </Label>
          <Input
            id="chat-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. jane@clinic.com"
            className="h-9 text-sm"
            data-testid="input-contact-email"
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div className="relative">
          <Label htmlFor="chat-country" className="text-xs flex items-center gap-1.5 mb-1">
            <MapPin className="h-3 w-3" /> Shipping Country
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
              className="h-9 text-sm"
              data-testid="input-contact-country"
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredCountries.map((c, idx) => {
                  if (c.code === "divider") {
                    return <div key={`divider-${idx}`} className="border-t my-1" />;
                  }
                  return (
                    <button
                      key={c.code}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
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
          size="sm"
          disabled={isLoading}
          className="w-full h-9 text-sm"
          data-testid="button-submit-contact-form"
        >
          <Send className="h-3.5 w-3.5 mr-2" />
          Submit Details
        </Button>
      </form>
    </motion.div>
  );
}

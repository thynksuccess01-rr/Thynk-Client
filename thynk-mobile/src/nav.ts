export type RootStackParamList = {
  Login: undefined;
  // admin
  Clients: undefined;
  Periods: { clientId: string; clientName: string };
  Period: { clientId: string; clientName: string; entryId?: string };
  CampaignForm: { clientId: string; entryId: string };
  LeadForm: { clientId: string; entryId?: string | null; leadId?: string };
  // client user
  ClientHome: undefined;
  // shared
  LeadDetail: { leadId: string };
};

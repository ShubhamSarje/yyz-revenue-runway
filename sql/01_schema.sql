-- YYZ Revenue Runway: 01 schema
-- One row per quarter (Q1 2018 - Q3 2026) from notebooks/01_clean_and_explore.ipynb
-- Units: revenue/costs/debt in CAD millions; passengers, seats, MTOW in millions; movements in thousands;
--        per-enplaned / per-tonne / CPE in CAD; *_pct in percent; *_real2019 in 2019 dollars.

drop table if exists quarterly_kpi cascade;
create table quarterly_kpi (
  period                             text primary key,
  year                               smallint not null,
  quarter                            smallint not null,
  period_start                       date not null,
  covid_period                       boolean,
  omicron_flag                       boolean,
  ground_rent_relief_flag            boolean,
  cpe_available                      boolean,
  revenue_total                      numeric,
  landing_fees                       numeric,
  general_terminal                   numeric,
  aero_revenue                       numeric,
  concessions_rentals                numeric,
  parking_ground                     numeric,
  other_revenue                      numeric,
  commercial_revenue                 numeric,
  aif_revenue                        numeric,
  ground_rent                        numeric,
  pilt                               numeric,
  goods_services                     numeric,
  salaries                           numeric,
  opex_before_amort                  numeric,
  ebitda                             numeric,
  net_income                         numeric,
  pax_domestic                       numeric,
  pax_international                  numeric,
  pax_total                          numeric,
  enplaned_pax                       numeric,
  movements                          numeric,
  mtow                               numeric,
  seats                              numeric,
  load_factor                        numeric,
  transborder_movements              numeric,
  itinerant_movements                numeric,
  transborder_share_pct              numeric,
  statcan_complete_quarter           boolean,
  total_debt                         numeric,
  net_debt                           numeric,
  debt_per_epax                      numeric,
  net_debt_per_epax                  numeric,
  cpe                                numeric,
  operating_covenant                 numeric,
  debt_service_covenant              numeric,
  gtc_domestic_per_seat              numeric,
  gtc_non_domestic_per_seat          numeric,
  landing_per_1000kg                 numeric,
  aif_local                          numeric,
  aif_connecting                     numeric,
  aero_rate_index                    numeric,
  cpi_ontario                        numeric,
  deflator_2019                      numeric,
  revenue_per_enplaned               numeric,
  aero_per_enplaned                  numeric,
  commercial_per_enplaned            numeric,
  parking_per_enplaned               numeric,
  aif_per_enplaned                   numeric,
  opex_per_enplaned                  numeric,
  aif_yield_ratio                    numeric,
  implied_connecting_share           numeric,
  ground_rent_share_pct              numeric,
  aero_share_pct                     numeric,
  commercial_share_pct               numeric,
  aif_share_pct                      numeric,
  seats_per_movement                 numeric,
  pax_per_movement                   numeric,
  mtow_tonnes_per_movement           numeric,
  aero_per_tonne_mtow                numeric,
  opex_per_movement_k                numeric,
  revenue_per_enplaned_real2019      numeric,
  aero_per_enplaned_real2019         numeric,
  commercial_per_enplaned_real2019   numeric,
  aif_per_enplaned_real2019          numeric,
  opex_per_enplaned_real2019         numeric,
  aero_per_tonne_mtow_real2019       numeric,
  cpe_real2019                       numeric
);

drop table if exists fee_rates cascade;
create table fee_rates (
  effective_date             date primary key,
  gtc_domestic_per_seat      numeric,
  gtc_non_domestic_per_seat  numeric,
  landing_per_1000kg         numeric,
  aif_local                  numeric,
  aif_connecting             numeric,
  source                     text
);

drop table if exists fee_changes cascade;
create table fee_changes (
  year       smallint primary key,
  pct        numeric,   -- stated % change in aeronautical fees effective January 1
  statement  text,
  source     text
);

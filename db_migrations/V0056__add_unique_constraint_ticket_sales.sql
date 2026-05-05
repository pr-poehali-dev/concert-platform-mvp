ALTER TABLE t_p17532248_concert_platform_mvp.ticket_sales
  ADD CONSTRAINT ticket_sales_integration_order_unique UNIQUE (integration_id, order_id);
